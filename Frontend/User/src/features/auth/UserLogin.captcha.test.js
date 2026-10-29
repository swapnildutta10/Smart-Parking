import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import UserLogin from "./UserLogin";

afterEach(cleanup);
test('login waits for the security image, sends the answer to the API and refreshes after failure', async () => {
  const original = global.fetch;
  let count = 0, posted;
  global.fetch = jest.fn(async (url, options) => {
    if (url.includes('/auth/captcha?purpose=user')) return { ok: true, json: async () => ({ id: `challenge-${++count}`, image: 'data:image/svg+xml;base64,PHN2Zy8+', expiresAt: new Date(Date.now() + 300000).toISOString() }) };
    posted = JSON.parse(options.body);
    return { ok: false, json: async () => ({ message: 'Email or password is incorrect.' }) };
  });
  try {
    render(<UserLogin />);
    const submit = screen.getByRole('button', { name: 'Log in' });
    expect(submit).toBeDisabled();
    await screen.findByAltText('Five-character CAPTCHA challenge');
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'driver@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'Password-123' } });
    fireEvent.change(screen.getByLabelText('Characters in the image'), { target: { value: 'a7bcd' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await screen.findByRole('alert');
    await waitFor(() => expect(count).toBe(2));
    expect(posted).toEqual(expect.objectContaining({ email: 'driver@example.com', captchaId: 'challenge-1', captchaAnswer: 'A7BCD' }));
    expect(screen.getByLabelText('Characters in the image')).toHaveValue('');
    expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('driver@example.com');
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Generate a new CAPTCHA' }));
    await waitFor(() => expect(count).toBe(3));
  } finally { global.fetch = original; }
});


import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AdminLogin from "./AdminLogin";

afterEach(cleanup);
test('admin login requires a challenge answer and refreshes a consumed image after an error', async () => {
  const original = global.fetch;
  let posted, count = 0;
  global.fetch = jest.fn(async (url, options) => {
    if (url.includes('/auth/captcha?purpose=admin')) return { ok: true, json: async () => ({ id: `admin-challenge-${++count}`, image: 'data:image/svg+xml;base64,PHN2Zy8+' }) };
    posted = JSON.parse(options.body);
    return { ok: false, json: async () => ({ message: 'The admin ID or password is incorrect.' }) };
  });
  try {
    render(<AdminLogin />);
    const submit = screen.getByRole('button', { name: 'Sign in to dashboard' });
    expect(submit).toBeDisabled();
    await screen.findByAltText('Five-character CAPTCHA challenge');
    fireEvent.change(screen.getByPlaceholderText('Enter your admin id'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'Password-123' } });
    fireEvent.change(screen.getByLabelText('Characters in the image'), { target: { value: 'A7BCD' } });
    fireEvent.click(submit);
    await screen.findByRole('alert');
    await waitFor(() => expect(count).toBe(2));
    expect(posted).toEqual(expect.objectContaining({ captchaId: 'admin-challenge-1', captchaAnswer: 'A7BCD' }));
    expect(screen.getByLabelText('Characters in the image')).toHaveValue('');
    expect(submit).toBeDisabled();
  } finally { global.fetch = original; }
});


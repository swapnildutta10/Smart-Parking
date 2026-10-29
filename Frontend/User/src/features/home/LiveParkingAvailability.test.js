import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import LiveParkingAvailability from "./LiveParkingAvailability";
import { parkingRequest, bookingWindow } from "../parkingSpot/parkingApi";

jest.mock("../parkingSpot/parkingApi", () => ({ ...jest.requireActual("../parkingSpot/parkingApi"), parkingRequest: jest.fn() }));

const fixture = {
  generatedAt: "2026-10-29T04:00:00Z", timezone: "Asia/Kolkata", mode: "now",
  startsAt: "2026-10-29T04:00:00Z", endsAt: "2026-10-29T04:00:00.001Z",
  locations: [
    { parkingId: "location-a", location: "Location A", area: "Area A", inventory: [
      { inventoryId: "inventory-a", parkingId: "location-a", location: "Location A", area: "Area A", vehicle: "Car", available: 2, reserved: 1, totalSlots: 3, rate: 20 },
    ] },
    { parkingId: "location-b", location: "Location B", area: "Area B", inventory: [
      { inventoryId: "inventory-b", parkingId: "location-b", location: "Location B", area: "Area B", vehicle: "Car", available: 0, reserved: 2, totalSlots: 2, rate: 30 },
    ] },
  ],
};

beforeEach(() => { parkingRequest.mockReset(); });
afterEach(() => { cleanup(); jest.useRealTimers(); });

test("filters locations and carries the checked booking window into reservation", async () => {
  parkingRequest.mockResolvedValue(fixture);
  const onBook = jest.fn();
  render(<LiveParkingAvailability onBook={onBook} />);
  await screen.findByText("Location A");
  fireEvent.change(screen.getByLabelText("Parking location"), { target: { value: "location-b" } });
  expect(screen.getByRole("button", { name: "Fully reserved" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Parking location"), { target: { value: "location-a" } });
  fireEvent.change(screen.getByLabelText("Show availability"), { target: { value: "window" } });
  const date = new Date(Date.now() + 3 * 86400000 + 330 * 60000).toISOString().slice(0, 10);
  fireEvent.change(screen.getByLabelText("Date (IST)"), { target: { value: date } });
  fireEvent.change(screen.getByLabelText("Arrival (IST)"), { target: { value: "10:30" } });
  fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "4" } });
  const window = bookingWindow(date, "10:30", 4);
  parkingRequest.mockResolvedValue({ ...fixture, mode: "window", startsAt: window.starts_at, endsAt: window.ends_at });
  fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
  await screen.findByText(/Showing .* to /);
  expect(parkingRequest).toHaveBeenLastCalledWith(`/availability?${new URLSearchParams(window)}`, expect.objectContaining({ signal: expect.anything() }));
  fireEvent.click(screen.getByRole("button", { name: "Reserve a space →" }));
  expect(onBook).toHaveBeenCalledWith(expect.objectContaining({ inventoryId: "inventory-a", bookingSelection: { date, time: "10:30", duration: 4 } }));
});

test("refreshes every ten seconds and blocks booking when a refresh fails", async () => {
  jest.useFakeTimers();
  parkingRequest.mockResolvedValueOnce(fixture).mockRejectedValueOnce(new Error("Availability offline"));
  render(<LiveParkingAvailability onBook={jest.fn()} />);
  await screen.findByText("Location A");
  expect(parkingRequest).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(parkingRequest).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("alert")).toHaveTextContent("Availability offline");
  expect(screen.getByRole("button", { name: "Reserve a space →" })).toBeDisabled();
});

test("server events refresh the visible count immediately and reconnects recover missed changes", async () => {
  jest.useFakeTimers();
  const original = window.EventSource;
  let stream;
  window.EventSource = jest.fn().mockImplementation(() => {
    stream = { handlers: {}, addEventListener: jest.fn((type, callback) => { stream.handlers[type] = callback; }), close: jest.fn() };
    return stream;
  });
  const updated = { ...fixture, locations: [{ ...fixture.locations[0], inventory: [{ ...fixture.locations[0].inventory[0], available: 1, reserved: 2 }] }] };
  parkingRequest.mockResolvedValueOnce(fixture).mockResolvedValue(updated);
  try {
    const { unmount } = render(<LiveParkingAvailability onBook={jest.fn()} />);
    await screen.findByText("Location A");
    await act(async () => { stream.handlers["availability-changed"]({ data: JSON.stringify({ inventoryId: "inventory-a", reason: "reserved" }) }); });
    expect(parkingRequest).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("img", { name: "Car: 1 available and 2 reserved spaces" })).toBeInTheDocument();
    await act(async () => { stream.onopen(); });
    expect(parkingRequest).toHaveBeenCalledTimes(3);
    unmount();
    expect(stream.close).toHaveBeenCalledTimes(1);
  } finally { cleanup(); window.EventSource = original; }
});

test("a change arriving during an in-flight load is queued instead of lost", async () => {
  jest.useFakeTimers();
  const original = window.EventSource;
  let stream, finishInitial;
  window.EventSource = jest.fn().mockImplementation(() => {
    stream = { handlers: {}, addEventListener: (name, callback) => { stream.handlers[name] = callback; }, close: jest.fn() };
    return stream;
  });
  const updated = { ...fixture, locations: [{ ...fixture.locations[0], inventory: [{ ...fixture.locations[0].inventory[0], available: 3, reserved: 0 }] }] };
  parkingRequest.mockImplementationOnce(() => new Promise(resolve => { finishInitial = resolve; })).mockResolvedValue(updated);
  try {
    render(<LiveParkingAvailability onBook={jest.fn()} />);
    await act(async () => {
      stream.handlers["availability-changed"]({ data: JSON.stringify({ reason: "cancelled" }) });
      stream.handlers["availability-changed"]({ data: JSON.stringify({ reason: "cancelled" }) });
      finishInitial(fixture);
    });
    expect(parkingRequest).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("img", { name: "Car: 3 available and 0 reserved spaces" })).toBeInTheDocument();
  } finally { cleanup(); window.EventSource = original; }
});

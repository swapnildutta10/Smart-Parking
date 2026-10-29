import { downloadReport } from "./reportingApi";

test("exports the applied date range, accurate signed amounts and safely quoted location text", async () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:report");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const append = jest.spyOn(document.body, "appendChild");
  const timer = jest.spyOn(window, "setTimeout").mockImplementation(callback => { callback(); return 0; });
  try {
    downloadReport({
      range: { from: "2026-10-01", to: "2026-10-02", timezone: "Asia/Kolkata" },
      totals: { bookings: 1, payments: 0, refunds: 1, grossCents: 0, refundCents: 525, netCents: -525, bookedAmountCents: 0 },
      bookingStatuses: { cancelled: 1 },
      daily: [{ date: "2026-10-02", bookings: 1, payments: 0, refunds: 1, grossCents: 0, refundCents: 525, netCents: -525 }],
      locations: [{ location: "=SUM(1+1)", address: 'North, "Gate"\nLevel 1', bookings: 1, cancelled: 1, bookedAmountCents: 0 }],
    });
    timer.mockRestore();
    const blob = URL.createObjectURL.mock.calls[0][0];
    const csv = await new Promise(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob);
    });
    expect(append.mock.calls[0][0].download).toBe("parknova-report-2026-10-01-to-2026-10-02.csv");
    expect(csv).toContain('"Timezone","Asia/Kolkata"');
    expect(csv).toContain('"Net recorded amount (INR)","-5.25"');
    expect(csv).toContain('"Refund amount (INR)","5.25"');
    expect(csv).toContain("\"'=SUM(1+1)\"");
    expect(csv).toContain('"North, ""Gate""\nLevel 1"');
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report");
  } finally {
    timer.mockRestore(); click.mockRestore(); append.mockRestore();
    URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  }
});

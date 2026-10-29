import React from "react";
import "@testing-library/jest-dom";
import { render, screen, cleanup } from "@testing-library/react";
import ParkingCapacityVisual from "./ParkingCapacityVisual";

afterEach(cleanup);

test.each([[6, 4], [0, 0], [8, 0], [8, 8], [100000, 34567]])("visual capacity stays accurate for %i spaces and %i available", (total, available) => {
  const { container } = render(<ParkingCapacityVisual total={total} available={available} vehicle="Car" />);
  const tiles = [...container.querySelectorAll("[data-capacity]")];
  expect(tiles.length).toBeLessThanOrEqual(24);
  expect(tiles.reduce((sum, tile) => sum + Number(tile.dataset.capacity), 0)).toBe(total);
  expect(tiles.reduce((sum, tile) => sum + Number(tile.dataset.available), 0)).toBe(available);
  expect(screen.getByRole("img")).toHaveAccessibleName(`Car: ${available} available and ${total - available} reserved spaces`);
  expect(screen.getByText(/positions are not assigned bay numbers/)).toBeInTheDocument();
});

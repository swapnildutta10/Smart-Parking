import React from "react";
import "./brand-logo.css";
import logo from "./parknova-logo.svg";

export default function BrandLogo() {
  return (
    <img className="pn-brand-logo" src={logo} width="340" height="80" alt="ParkNova" />
  );
}

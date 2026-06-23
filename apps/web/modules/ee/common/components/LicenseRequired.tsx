"use client";

import type { AriaRole } from "react";
import React, { Fragment } from "react";

// Self-hosted (MIT) build: enterprise license gating removed.
// This wrapper now renders its children unconditionally.

type LicenseRequiredProps = {
  as?: keyof JSX.IntrinsicElements | "";
  className?: string;
  role?: AriaRole | undefined;
  children: React.ReactNode;
};

const LicenseRequired = ({ children, as = "", ...rest }: LicenseRequiredProps) => {
  const Component = as || Fragment;
  return <Component {...rest}>{children}</Component>;
};

export default LicenseRequired;
export const withLicenseRequired = <T extends JSX.IntrinsicAttributes>(
  Component: React.ComponentType<T>
) => {
  // eslint-disable-next-line react/display-name
  return (hocProps: T) => (
    <LicenseRequired>
      <Component {...hocProps} />
    </LicenseRequired>
  );
};

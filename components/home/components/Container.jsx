import React from "react";

export function Container({ children, className }) {
  return (
    <div
      className={` py-3 sm:py-8 !px-4 lg:!px-6 mx-auto ${className ? className : ""}`}
    >
      {children}
    </div>
  );
}


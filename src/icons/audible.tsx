import React from "react";

export const AudibleIcon = ({
  size,
  className,
}: {
  size: string;
  className?: string;
}) => (
  <svg
    className={className ? className : ""}
    style={{ fill: "currentColor" }}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
  >
    <path d="M2.005 10.238L2.005 11.928 12.007 18.182 21.995 11.928 21.995 10.238 12.007 16.467z" />
    <path d="M15.938,12.469l1.465-0.938c-1.161-1.701-3.153-2.876-5.396-2.876c-2.257,0-4.236,1.135-5.371,2.89 c0.093-0.093,0.146-0.146,0.238-0.211C9.685,8.998,13.734,9.526,15.938,12.469z" />
    <path d="M9.051 13.063c.528-.383 1.134-.58 1.78-.58 1.083 0 2.047.554 2.692 1.49l1.399-.871c-.607-.963-1.688-1.557-2.916-1.557C10.78 11.545 9.697 12.165 9.051 13.063zM5.25 9.012c4.117-3.246 9.937-2.362 13.037 1.953l.026.026 1.517-.938c-1.662-2.547-4.552-4.235-7.823-4.235-3.246 0-6.136 1.663-7.825 4.235C4.486 9.711 4.868 9.302 5.25 9.012z" />
  </svg>
);
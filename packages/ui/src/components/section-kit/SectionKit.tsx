import React from "react";

export interface SectionKitProps {
  children: React.ReactNode;
  title?: string;
}

export const SectionKit: React.FC<SectionKitProps> = ({ children, title }) => {
  return (
    <section>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
};

import React from 'react';

export interface ClassBuilder {
  classes: string[];
  add(className: string | false | undefined): ClassBuilder;
  join(): string;
}

export function buildClasses(): ClassBuilder {
  const classes: string[] = [];
  
  return {
    classes,
    add(className: string | false | undefined) {
      if (className) classes.push(className);
      return this;
    },
    join() {
      return classes.join(' ');
    }
  };
}

export function renderConditional(condition: boolean, component: React.ReactNode): React.ReactNode {
  return condition ? component : null;
}
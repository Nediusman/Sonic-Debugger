import { useEffect, useId, useRef } from "react";
import type { ReactElement, ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
}

/** Native modal dialog: focus moves to the heading, Escape closes, focus goes back to the opener. */
export function Dialog({ open, title, onClose, children }: DialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<Element | null>(null);
  const closedByParent = useRef(false);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
      headingRef.current?.focus();
    } else if (!open && dialog.open) {
      closedByParent.current = true;
      dialog.close();
    }
  }, [open]);

  const handleClose = (): void => {
    const target = opener.current;
    opener.current = null;
    if (target instanceof HTMLElement && target !== document.body) target.focus();
    if (closedByParent.current) closedByParent.current = false;
    else onClose();
  };

  return (
    <dialog ref={dialogRef} aria-labelledby={headingId} onClose={handleClose}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1}>{title}</h2>
      {open ? children : null}
    </dialog>
  );
}

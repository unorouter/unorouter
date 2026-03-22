"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { atom, useAtom } from "jotai";

const docsSidebarOpenAtom = atom(true);

interface DocsSidebarProviderProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function DocsSidebarProvider(props: DocsSidebarProviderProps) {
  const [open, setOpen] = useAtom(docsSidebarOpenAtom);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen} style={props.style}>
      {props.children}
    </SidebarProvider>
  );
}

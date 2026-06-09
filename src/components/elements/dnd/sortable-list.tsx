"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";

export type SortableListProps<T extends { id: string }> = {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, handle: ReactNode, isDragging: boolean) => ReactNode;
  className?: string;
};

export function SortableList<T extends { id: string }>(
  props: SortableListProps<T>,
) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const active = event.active;
    const over = event.over;
    if (!over || active.id === over.id) return;
    const oldIndex = props.items.findIndex((it) => it.id === active.id);
    const newIndex = props.items.findIndex((it) => it.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(props.items, oldIndex, newIndex);
    props.onReorder(next.map((it) => it.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={props.items.map((it) => it.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={cn("flex flex-col gap-1.5", props.className)}>
          {props.items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              renderItem={(handle, isDragging) =>
                props.renderItem(item, handle, isDragging)
              }
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow(props: {
  id: string;
  renderItem: (handle: ReactNode, isDragging: boolean) => ReactNode;
}) {
  // dnd-kit setters look like refs to React Compiler's ref-access lint rule;
  // they're the documented public API, so the rule is suppressed at usage.
  const sortable = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.6 : 1,
  };
  const handle = (
    <button
      type="button"
      // eslint-disable-next-line react-hooks/refs
      ref={sortable.setActivatorNodeRef}
      // eslint-disable-next-line react-hooks/refs
      {...sortable.listeners}
      // eslint-disable-next-line react-hooks/refs
      {...sortable.attributes}
      className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 cursor-grab items-center justify-center rounded transition active:cursor-grabbing"
      aria-label="Drag to reorder"
    >
      <Icon name="grip-vertical" className="size-4" />
    </button>
  );
  return (
    <li
      // eslint-disable-next-line react-hooks/refs
      ref={sortable.setNodeRef}
      style={style}
      className="list-none"
    >
      {/* eslint-disable-next-line react-hooks/refs */}
      {props.renderItem(handle, sortable.isDragging)}
    </li>
  );
}

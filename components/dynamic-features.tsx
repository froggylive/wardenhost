"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export function DynamicFeatures({ initial = [] }: { initial?: string[] }) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);

  return (
    <div>
      {items.map((value, index) => (
        <div key={index} className="mb-2 flex gap-2">
          <input type="hidden" name="features" value={value} />
          <input
            className="input"
            value={value}
            placeholder={`Feature ${index + 1}, e.g. Full Root Access`}
            onChange={(e) =>
              setItems((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))
            }
          />
          <button
            type="button"
            className="btn-secondary shrink-0 px-3"
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            disabled={items.length === 1}
            aria-label="Remove feature"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary mt-1" onClick={() => setItems((prev) => [...prev, ""])}>
        <Plus size={15} /> Add Feature
      </button>
    </div>
  );
}

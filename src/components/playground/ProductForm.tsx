"use client";

interface ProductFormProps {
  productName: string;
  onProductNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
}

export default function ProductForm({
  productName,
  onProductNameChange,
  description,
  onDescriptionChange,
}: ProductFormProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Product Name / Prefix
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
          placeholder="e.g. ashley-59302"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <p className="text-xs text-zinc-600 mt-1">Used for file naming: prefix-000.jpg</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Product Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="2-seat beige power reclining loveseat with center console, smooth faux-leather upholstery..."
          rows={4}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
        />
        <p className="text-xs text-zinc-600 mt-1">Helps the AI preserve product identity across angles</p>
      </div>
    </div>
  );
}
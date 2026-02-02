import React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Row } from "../../ui/Form"

const schema = z.object({
  montant: z.number().positive("Le montant doit être > 0"),
  mode_paiement: z.enum([
    "especes",
    "carte",
    "virement",
    "wave",
    "orange_money",
    "free_money",
    "cheque",
  ]),
  reference: z.string().max(100).optional(),
  date_paiement: z.string().optional(),
  notes: z.string().optional(),
})

export type AddPaymentInput = z.infer<typeof schema>

export const AddPaymentForm: React.FC<{
  defaultValues?: Partial<AddPaymentInput>
  onSubmit: (vals: AddPaymentInput) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddPaymentInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode_paiement: "especes",
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Row label="Montant">
        <input
          className="input"
          type="number"
          step="0.01"
          {...register("montant", { valueAsNumber: true })}
        />
        {errors.montant && (
          <p className="text-red-600 text-xs mt-1">{errors.montant.message}</p>
        )}
      </Row>

      <Row label="Mode de paiement">
        <select className="input" {...register("mode_paiement")}>
          <option value="especes">Espèces</option>
          <option value="carte">Carte</option>
          <option value="virement">Virement</option>
          <option value="wave">Wave</option>
          <option value="orange_money">Orange Money</option>
          <option value="free_money">Free Money</option>
          <option value="cheque">Chèque</option>
        </select>
      </Row>

      <Row label="Référence (optionnel)">
        <input className="input" {...register("reference")} placeholder="N° reçu / ref..." />
      </Row>

      <Row label="Date paiement (optionnel)">
        <input type="date" className="input" {...register("date_paiement")} />
      </Row>

      <Row label="Notes (optionnel)">
        <textarea className="input min-h-[90px]" {...register("notes")} />
      </Row>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn bg-gray-200 dark:bg-white/10"
          onClick={onCancel}
        >
          Annuler
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          Ajouter
        </button>
      </div>
    </form>
  )
}

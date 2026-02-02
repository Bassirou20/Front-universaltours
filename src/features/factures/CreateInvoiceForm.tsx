import React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Row } from "../../ui/Form"

const schema = z.object({
  date_facture: z.string().optional(),
  montant_total: z
    .number()
    .positive("Le montant doit être > 0")
    .optional(),
})

export type CreateInvoiceInput = z.infer<typeof schema>

export const CreateInvoiceForm: React.FC<{
  defaultValues?: Partial<CreateInvoiceInput>
  onSubmit: (vals: CreateInvoiceInput) => void
  onCancel: () => void
  submitting?: boolean
}> = ({ defaultValues, onSubmit, onCancel, submitting }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Row label="Date facture (optionnel)">
        <input type="date" className="input" {...register("date_facture")} />
      </Row>

      <Row label="Montant total (optionnel)">
        <input
          className="input"
          type="number"
          step="0.01"
          placeholder="Par défaut: montant de la réservation"
          {...register("montant_total", { valueAsNumber: true })}
        />
        {errors.montant_total && (
          <p className="text-red-600 text-xs mt-1">{errors.montant_total.message}</p>
        )}
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
          Créer
        </button>
      </div>
    </form>
  )
}

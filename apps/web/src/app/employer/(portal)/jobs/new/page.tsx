"use client"

import JobForm, { EMPTY_FORM } from "@/components/employer/JobForm"

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Yeni vakansiya</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vakansiya qaralama kimi yaradılır. Hazır olduqda yoxlamaya göndərə bilərsiniz.
        </p>
      </div>
      <JobForm initial={EMPTY_FORM} submitLabel="Qaralama yarat" />
    </div>
  )
}
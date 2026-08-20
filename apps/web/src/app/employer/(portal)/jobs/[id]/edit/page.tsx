"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import JobForm, { jobToForm } from "@/components/employer/JobForm"
import { employerApi, type EmployerJob } from "@/lib/employer-api"

export default function EditJobPage() {
  const params = useParams<{ id: string }>()
  const [job, setJob] = useState<EmployerJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    employerApi
      .getJob(params.id)
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"))
  }, [params.id])

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-slate-500">
        {error}
      </div>
    )
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Vakansiyanı redaktə et</h1>
        <p className="mt-1 text-sm text-slate-500">{job.title}</p>
      </div>
      <JobForm
        initial={jobToForm(job)}
        jobId={job.id}
        submitLabel="Yadda saxla"
      />
    </div>
  )
}
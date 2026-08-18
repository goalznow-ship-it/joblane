import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Azərbaycanın ən yaxşı iş platforması
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          İş axtaranlar və işə qəbul edənlər üçün müasir, etibarlı və sürətli həlliyyət
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/jobs">İşləri göstər</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/employer">İş elan et</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Niyə Joblane?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Sürətli Axtarış</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Minlərlə iş elanını saniyələr ərzində axtarın və tapın
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Etibarlı Şirkətlər</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Təsdiq edilmiş şirkətlərdən ən yaxşı təklifləri alın
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pulsuz Xidmət</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  İş axtaranlar üçün tamamilə pulsuz xidmət
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-6">
          Hazırsınızmı karyera yolculuğuna başlamağa?
        </h2>
        <Button size="lg" asChild>
          <Link href="/register">Qeydiyyatdan keç</Link>
        </Button>
      </section>
    </main>
  )
}
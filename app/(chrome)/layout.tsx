import { GradientBackground } from '@/components/decor/GradientBackground'
import { Nav } from '@/components/nav/Nav'
import { Footer } from '@/components/nav/Footer'

export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientBackground />
      <Nav />
      <div className="pt-24 sm:pt-28">{children}</div>
      <Footer />
    </>
  )
}

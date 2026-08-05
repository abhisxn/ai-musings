import Link from 'next/link'

const PORTFOLIO_URL = 'https://thatguyabhishek.com'
const YEAR = new Date().getFullYear()

const SOCIALS = [
  { label: 'LinkedIn', emoji: '👤', href: 'https://www.linkedin.com/in/thatguyabhishek/' },
  { label: 'Dribbble', emoji: '⚡', href: 'https://dribbble.com/abhisheksaxena' },
  { label: 'Behance', emoji: '🔸', href: 'https://www.behance.net/thatguyabhishek' },
]

const LINKS = [
  { label: 'About', emoji: '☝', href: `${PORTFOLIO_URL}/about` },
  { label: 'Work', emoji: '🎨', href: `${PORTFOLIO_URL}/work` },
  { label: 'Awards', emoji: '🏆', href: `${PORTFOLIO_URL}/awards` },
]

const CONTACT = [
  { label: 'Call for a Chat', emoji: '📞', href: 'tel:+919999005281' },
  { label: 'Send an email', emoji: '📧', href: 'mailto:abhisxn@gmail.com' },
  { label: 'WhatsApp me', emoji: '💬', href: 'https://wa.me/919999005281' },
]

export function Footer() {
  return (
    <footer className="border-t border-border-1 text-fg relative z-10">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-16 py-14 sm:py-20 lg:py-24">
        <div className="flex flex-col gap-12 sm:gap-16">
          {/* CTA headline */}
          <div>
            <p className="t-h3 max-w-4xl">
              Good design isn&apos;t decoration. It&apos;s the decision that changes the outcome. If
              that&apos;s who you&apos;re looking for,{' '}
              <span className="text-accent">look no further, get in touch.</span>
            </p>
            <hr className="mt-8 border-border-1" />
          </div>

          {/* Contact CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="t-h4">Have an exciting project?</p>
              <p className="t-body1 text-fg/70">Let&apos;s work together.</p>
            </div>
            <a
              href="mailto:abhisxn@gmail.com"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full font-medium text-sm border border-fg/30 text-fg hover:bg-fg hover:text-bg transition-colors duration-200"
            >
              Connect with me
            </a>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-border-1 pt-10 text-center">
            <div className="flex flex-col gap-4 items-center">
              <p className="t-body1 font-semibold text-fg">Socials</p>
              {SOCIALS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-body2 text-fg/70 inline-block font-medium relative after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:after:w-full"
                >
                  {link.emoji} {link.label}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-4 items-center">
              <p className="t-body1 font-semibold text-fg">Links</p>
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-body2 text-fg/70 inline-block font-medium relative after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:after:w-full"
                >
                  {link.emoji} {link.label}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-4 items-center">
              <p className="t-body1 font-semibold text-fg">Contact</p>
              {CONTACT.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="t-body2 text-fg/70 inline-block font-medium relative after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:after:w-full"
                >
                  {link.emoji} {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border-1">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-16 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 t-caption text-fg/60">
          <span>© {YEAR} Abhishek Saxena</span>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-accent transition-colors">
              AI Musings
            </Link>
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              thatguyabhishek.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

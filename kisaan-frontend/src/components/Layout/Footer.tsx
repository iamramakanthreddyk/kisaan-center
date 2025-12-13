import { Logo } from "../ui/logo"

const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <Logo size="sm" variant="minimal" />
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built for farmers, by farmers. Empowering agricultural communities worldwide.
        </p>
      </div>
    </footer>
  )
}

export default Footer
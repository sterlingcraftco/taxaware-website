const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">NG</span>
              </div>
              <span className="font-bold text-lg text-foreground">TaxAware Nigeria</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Educating Nigerians about tax compliance
            </p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground mb-1">
              This is an educational resource, not official FIRS communication.
            </p>
            <p className="text-sm text-muted-foreground">
              For official information, visit{" "}
              <a
                href="https://www.firs.gov.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                firs.gov.ng
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TaxAware Nigeria. Built with 💚 for Nigerians.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

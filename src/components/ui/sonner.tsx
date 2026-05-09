import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      duration={1000}
      position="top-center"
      offset={72}
      visibleToasts={1}
      className="toaster pointer-events-none"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          zIndex: 9999,
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

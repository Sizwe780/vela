import Image from "next/image";

export const velaLogoSrc = "/vela-logo-v2.png";

export function VelaLogo({ size }: { size: number }) {
  return <Image src={velaLogoSrc} alt="Vela" width={size} height={size} />;
}

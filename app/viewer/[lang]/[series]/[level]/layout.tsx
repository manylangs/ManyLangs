import { ReactNode } from "react";
import ViewerHeaderClient from "../../../components/ViewerHeaderClient";
import ViewerGuardClient from "../../../components/ViewerGuardClient";

type Props = {
  children: ReactNode;
  params: {
    lang: string;
    series: string;
    level: string;
  };
};

export default function ViewerLevelLayout({ children }: Props) {
  return (
    <>
      <ViewerHeaderClient />
      <ViewerGuardClient>
        <main>{children}</main>
      </ViewerGuardClient>
    </>
  );
}

import { redirect } from "next/navigation";

export default function NotebookShortcut() {
  redirect("/practice/math?notebook=1");
}

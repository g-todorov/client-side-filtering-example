import Link from "next/link";

export default function Home() {
  return (
    <main className="menu">
      <Link href={"/first-iteration"}>First iteration</Link>
      <Link href={"/second-iteration"}>Second iteration</Link>
    </main>
  );
}

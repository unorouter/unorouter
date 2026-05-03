type Props = {
  children: React.ReactNode;
};

export default function StatusLayout(props: Props) {
  return <main className="flex-1">{props.children}</main>;
}

type ButtonProps = {
  children: string;
  link?: string;
  onClick?: any;
};
export default function Button({ children, link, onClick }: ButtonProps) {
  return (
    <div className="btn-wrapper">
      <a href={link ? link : '#'} onClick={onClick}>
        <div className="btn">{children}</div>
      </a>
    </div>
  );
}

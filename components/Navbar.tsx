export default function Navbar() {
  return (
    <nav className="w-full px-6 py-4 border-b bg-white">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">ManyLangs</h1>
        <div className="flex gap-6 text-gray-700">
          <a href="/">Home</a>
          <a href="/books">Books</a>
          <a href="/login">Login</a>
        </div>
      </div>
    </nav>
  );
}

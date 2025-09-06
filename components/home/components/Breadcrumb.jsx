
const Breadcrumb = ({ items }) => {
    return (
        <nav className="mb-4" aria-label="Breadcrumb">
            <ol className="list-reset flex text-gray-500">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        {index > 0 && <span className="mx-2">/</span>}
                        {item.href ? (
                            <a href={item.href} className="text-blue-500 hover:text-blue-700">
                                {item.label}
                            </a>
                        ) : (
                            <span>{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumb;

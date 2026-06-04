/* Conversión de frontend/index.html → componente React */
const IndexHtml = () => {
  return (
    <html lang="es">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Alerta Sofía — Simulador Radio Dinámico</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 font-['Inter']">
        <div id="root" />
        <script type="module" src="/src/main.jsx" />
      </body>
    </html>
  );
};

export default IndexHtml;

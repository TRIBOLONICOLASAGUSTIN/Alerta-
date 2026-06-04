/* Conversión de frontend/dist/index.html → componente React */
const DistIndex = () => {
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
        <script type="module" crossOrigin="" src="/assets/index-c5P3tI9n.js" />
        <link rel="stylesheet" crossOrigin="" href="/assets/index-BRcIEnII.css" />
      </head>
      <body className="bg-slate-950 text-slate-100 font-['Inter']">
        <div id="root" />
      </body>
    </html>
  );
};

export default DistIndex;

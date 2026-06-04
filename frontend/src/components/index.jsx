import GeovalladoPoc from './GeovalladoPoc.jsx';
import IndexHtml     from './IndexHtml.jsx';
import DistIndex     from './DistIndex.jsx';

export { GeovalladoPoc, IndexHtml, DistIndex };

/* Renderiza todos los componentes convertidos desde HTML.
   GeovalladoPoc es el único con contenido visual completo;
   IndexHtml y DistIndex son representaciones de los shells HTML. */
const ConvertedPages = () => {
  return <GeovalladoPoc />;
};

export default ConvertedPages;

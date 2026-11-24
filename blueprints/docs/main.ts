import { boot } from '../_shared/boot';
import '../../components/ui/controls/search-input/search-input.css';
import '../../components/ui/controls/tree-view/tree-view.css';
import '../../components/ui/controls/copy-button/copy-button.css';
import '../../components/ui/navigation/breadcrumbs/breadcrumbs.css';
import '../../components/ui/navigation/scrollspy-toc/scrollspy-toc.css';
import '../../components/ui/data/code-block/code-block.css';
import '../../components/ui/data/timeline/timeline.css';
import '../../components/ui/feedback/callout/callout.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/kbd/kbd.css';
import './page.css';
import { enhance as search } from '../../components/ui/controls/search-input/search-input';
import { enhance as tree } from '../../components/ui/controls/tree-view/tree-view';
import { enhance as crumbs } from '../../components/ui/navigation/breadcrumbs/breadcrumbs';
import { enhance as toc } from '../../components/ui/navigation/scrollspy-toc/scrollspy-toc';
import { enhance as code } from '../../components/ui/data/code-block/code-block';

boot({ 'search-input': search, 'tree-view': tree, breadcrumbs: crumbs, 'scrollspy-toc': toc, 'code-block': code });

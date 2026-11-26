import type { Cleanup } from '../../_shared/dom';

/**
 * Spot illustrations for art panels: the business's own things (a cup, a loaf, a crane, a document) drawn
 * flat and geometric on a 160 grid, so a panel without a photograph still shows the subject. Every motif uses
 * the same parts, coloured by the panel's tokens in art-panel.css:
 *   data-m="a"    the main fill (the accent)
 *   data-m="b"    the second fill (a pale tint)
 *   data-m="sil"  a silhouette drawn under the fills, so only the outer edge shows (one stroke weight)
 *   data-m="ink"  lines and outlines, one stroke weight, round caps
 *   data-m="dot"  small solid ink marks
 * One motif per line, `name: ['keywords', '<svg body>'],` (Node scripts read this table too, see
 * scripts/lib/image-motifs.mjs): double quotes only inside the markup.
 */
export const MOTIFS: Record<string, readonly [string, string]> = {
  cup: ['coffee cafe café espresso latte roaster roastery bean beans tea teahouse mug cup barista brew', '<ellipse data-m="b" cx="78" cy="128" rx="54" ry="10"/><path data-m="a" d="M34 60H118V94A30 30 0 0 1 88 124H64A30 30 0 0 1 34 94Z"/><path data-m="b" d="M34 74H118V86H34Z"/><g data-m="ink"><ellipse cx="78" cy="128" rx="54" ry="10"/><path d="M34 60H118V94A30 30 0 0 1 88 124H64A30 30 0 0 1 34 94Z"/><path d="M118 70H126A14 14 0 0 1 126 98H116"/><path d="M58 44C52 36 64 32 58 22M76 44C70 36 82 32 76 22M94 44C88 36 100 32 94 22"/></g>'],
  loaf: ['bakery bread baker baking loaf sourdough pastry patisserie croissant cake bake rye flour', '<rect data-m="b" x="14" y="116" width="132" height="16" rx="8"/><path data-m="a" d="M26 116C26 74 50 50 80 50S134 74 134 116Z"/><g data-m="ink"><rect x="14" y="116" width="132" height="16" rx="8"/><path d="M26 116C26 74 50 50 80 50S134 74 134 116Z"/><path d="M52 92C58 80 68 74 80 72M70 106C78 92 92 84 106 82M90 70C96 64 104 62 112 64"/></g><circle data-m="dot" cx="132" cy="124" r="3"/>'],
  crane: ['construction builder builders building contractor site crane civil engineering scaffold groundworks scaffolding', '<rect data-m="b" x="86" y="78" width="52" height="62"/><rect data-m="a" x="102" y="58" width="22" height="14" rx="2"/><path data-m="a" d="M14 32H34V44H14Z"/><g data-m="ink"><path d="M40 140V28M54 140V28M40 136L54 122L40 108L54 94L40 80L54 66L40 52L54 38"/><path d="M14 32H146M47 14V32M47 14L146 32M47 14L14 32"/><path d="M113 32V58"/><rect x="102" y="58" width="22" height="14" rx="2"/><rect x="86" y="78" width="52" height="62"/><path d="M98 92H108M116 92H126M98 106H108M116 106H126M98 120H108M116 120H126"/><path d="M8 140H152"/></g>'],
  document: ['law legal lawyer solicitor solicitors notary contract contracts accountant accountancy accounting tax invoice invoices insurance office paperwork bookkeeping agreement form compliance consultancy notes tasks todo forms docs permit permits benefits audit procurement governance admin documents policy policies invoicing billing expense expenses ledger', '<path data-m="b" d="M42 20H104L126 42V140H42Z"/><circle data-m="a" cx="110" cy="118" r="22"/><g data-m="ink"><path d="M42 20H104L126 42V140H42Z"/><path d="M104 20V42H126"/><path d="M58 54H98M58 68H110M58 82H110M58 96H88"/><path d="M56 124C62 112 66 130 72 118S82 126 86 118"/><circle cx="110" cy="118" r="22"/><circle cx="110" cy="118" r="13"/></g>'],
  scales: ['justice court barrister judge fair mediation arbitration legal scales balance tribunal rights', '<path data-m="a" d="M16 86H56A20 20 0 0 1 16 86Z"/><path data-m="a" d="M104 86H144A20 20 0 0 1 104 86Z"/><rect data-m="b" x="50" y="126" width="60" height="12" rx="6"/><g data-m="ink"><path d="M80 32V126M32 44H128"/><circle cx="80" cy="26" r="6"/><path d="M32 44L18 86M32 44L46 86M128 44L114 86M128 44L142 86"/><path d="M16 86H56A20 20 0 0 1 16 86ZM104 86H144A20 20 0 0 1 104 86Z"/><rect x="50" y="126" width="60" height="12" rx="6"/></g>'],
  leaf: ['garden gardener gardening plant plants florist flower flowers nursery landscaping landscape organic farm herb herbal eco botanical tree forestry green allotment wellness yoga meditation nature environment sustainability climate', '<path data-m="a" d="M78 138C38 122 28 70 62 24C96 58 100 110 78 138Z"/><path data-m="b" d="M84 138C98 110 118 96 144 94C142 122 116 142 84 138Z"/><g data-m="ink"><path d="M78 138C38 122 28 70 62 24C96 58 100 110 78 138Z"/><path d="M84 138C98 110 118 96 144 94C142 122 116 142 84 138Z"/><path d="M78 138C72 100 68 64 62 24M73 100L54 84M70 76L56 62M76 110L90 96"/><path d="M84 138C104 124 122 110 144 94"/><path d="M80 138V150"/></g>'],
  phone: ['app apps mobile phone smartphone call telecom software saas digital startup product platform messaging', '<rect data-m="b" x="46" y="14" width="68" height="132" rx="14"/><rect data-m="a" x="58" y="46" width="44" height="30" rx="5"/><g data-m="ink"><rect x="46" y="14" width="68" height="132" rx="14"/><path d="M72 26H88M70 134H90"/><rect x="58" y="46" width="44" height="30" rx="5"/><path d="M58 92H102M58 106H92M58 120H98"/></g>'],
  chart: ['finance financial analytics analysis investment investing data report reports growth metrics bank banking dashboard statistics wealth pension economics observability kpi kpis trading trader stocks stock markets exchange forex reporting', '<rect data-m="b" x="32" y="96" width="18" height="36" rx="2"/><rect data-m="b" x="58" y="78" width="18" height="54" rx="2"/><rect data-m="b" x="84" y="62" width="18" height="70" rx="2"/><rect data-m="a" x="110" y="40" width="18" height="92" rx="2"/><g data-m="ink"><path d="M20 20V132H146"/><path d="M41 82L67 64L93 50L126 22"/><path d="M114 22H126V34"/></g><circle data-m="dot" cx="41" cy="82" r="4"/><circle data-m="dot" cx="67" cy="64" r="4"/><circle data-m="dot" cx="93" cy="50" r="4"/>'],
  key: ['estate agent agents letting lettings landlord rental rent property locksmith keys key hotel hostel holiday stay mortgage airbnb lodge lodges cottage cottages', '<path data-m="b" d="M98 80H138V94H130V102H120V94H112V102H98Z"/><circle data-m="a" cx="48" cy="80" r="28"/><circle data-m="cut" cx="40" cy="80" r="10"/><g data-m="ink"><circle cx="48" cy="80" r="28"/><circle cx="40" cy="80" r="10"/><path d="M76 80H138V94H130V102H120V94H112V102H98V94"/></g><circle data-m="dot" cx="62" cy="64" r="3"/>'],
  ticket: ['event events ticket tickets theatre theater cinema film concert gig music festival museum gallery exhibition conference show venue club nightlife clubs gigs summit summits workshop workshops boxoffice', '<g transform="rotate(8 80 80)"><path data-m="b" d="M30 52H130V72A8 8 0 0 0 130 88V108H30V88A8 8 0 0 0 30 72Z"/></g><g transform="rotate(-8 80 80)"><path data-m="a" d="M24 46H136V68A8 8 0 0 0 136 84V106H24V84A8 8 0 0 0 24 68Z"/><g data-m="ink"><path d="M24 46H136V68A8 8 0 0 0 136 84V106H24V84A8 8 0 0 0 24 68Z"/><path d="M108 50V102" stroke-dasharray="3 7"/><path d="M40 66H88M40 80H78M40 94H84"/><circle cx="122" cy="76" r="6"/></g></g>'],
  tool: ['repair repairs plumber plumbing mechanic garage electrician electrical handyman maintenance tools tool workshop joinery carpenter carpentry fix service servicing trades tradesman tradespeople roofer roofing joiner decorator fitter fitters', '<g transform="rotate(-40 80 80)"><g data-m="sil"><rect x="30" y="72" width="84" height="16" rx="8"/><circle cx="122" cy="80" r="22"/><circle cx="30" cy="80" r="16"/></g><g data-m="a"><rect x="30" y="72" width="84" height="16" rx="8"/><circle cx="122" cy="80" r="22"/><circle cx="30" cy="80" r="16"/></g><path data-m="cut" d="M126 70H150V90H126Z"/><circle data-m="cut" cx="30" cy="80" r="7"/><g data-m="ink"><path d="M150 70H126V90H150"/><circle cx="30" cy="80" r="7"/><path d="M52 80H96"/></g></g>'],
  house: ['home homes house housing residential property architect architecture interiors interior cleaning cleaner removals mortgage surveyor roofing roofer realtor letting landlords tenants renovation renovations refurbishment extension extensions loft conversion conversions bricklayer', '<rect data-m="b" x="36" y="74" width="88" height="62"/><path data-m="a" d="M22 76L80 28L138 76Z"/><rect data-m="a" x="70" y="100" width="20" height="36"/><g data-m="ink"><path d="M104 46V36H116V56"/><path d="M22 76L80 28L138 76Z"/><rect x="36" y="76" width="88" height="60"/><rect x="70" y="100" width="20" height="36"/><rect x="98" y="90" width="16" height="16"/><path d="M106 90V106M98 98H114M12 136H148"/></g>'],
  tooth: ['dentist dental dentistry orthodontist orthodontics teeth tooth hygienist smile clinic implant dentists', '<path data-m="b" d="M52 34C38 34 32 48 34 62C36 80 44 92 48 112C51 128 56 140 64 140C72 140 72 120 80 114C88 120 88 140 96 140C104 140 109 128 112 112C116 92 124 80 126 62C128 48 122 34 108 34C98 34 92 40 80 40C68 40 62 34 52 34Z"/><path data-m="a" d="M134 20L138 30L148 34L138 38L134 48L130 38L120 34L130 30Z"/><g data-m="ink"><path d="M52 34C38 34 32 48 34 62C36 80 44 92 48 112C51 128 56 140 64 140C72 140 72 120 80 114C88 120 88 140 96 140C104 140 109 128 112 112C116 92 124 80 126 62C128 48 122 34 108 34C98 34 92 40 80 40C68 40 62 34 52 34Z"/><path d="M50 50C45 56 45 66 47 74"/></g>'],
  bowl: ['restaurant restaurants food kitchen chef dining dinner lunch noodle noodles ramen soup takeaway catering eatery bistro canteen meal meals cook cooking street', '<path data-m="b" d="M34 80C40 60 60 54 80 58C100 54 120 60 126 80Z"/><path data-m="a" d="M22 80H138C138 112 112 132 80 132C48 132 22 112 22 80Z"/><g data-m="ink"><path d="M22 80H138C138 112 112 132 80 132C48 132 22 112 22 80Z"/><path d="M34 80C40 60 60 54 80 58C100 54 120 60 126 80"/><path d="M62 132V140H98V132"/><path d="M100 18L72 70M118 22L88 72"/></g>'],
  scissors: ['salon hair hairdresser hairdressing barber barbers beauty stylist tailor tailoring sewing alterations craft crafts haberdashery spa', '<path data-m="b" d="M60 100L104 20L112 24L72 104Z"/><path data-m="b" d="M100 100L56 20L48 24L88 104Z"/><circle data-m="a" cx="54" cy="116" r="18"/><circle data-m="a" cx="106" cy="116" r="18"/><circle data-m="cut" cx="54" cy="116" r="8"/><circle data-m="cut" cx="106" cy="116" r="8"/><g data-m="ink"><path d="M60 100L104 20L112 24L72 104M100 100L56 20L48 24L88 104"/><circle cx="54" cy="116" r="18"/><circle cx="106" cy="116" r="18"/><circle cx="54" cy="116" r="8"/><circle cx="106" cy="116" r="8"/></g><circle data-m="dot" cx="80" cy="70" r="4"/>'],
  book: ['book books bookshop bookstore library publisher publishing school tutor tutoring tuition course courses learning education teacher teaching reading author writer university college magazine magazines editorial journal news poetry stories', '<path data-m="a" d="M14 50V130C40 124 62 128 80 138C98 128 120 124 146 130V50Z"/><path data-m="b" d="M80 46C64 36 42 34 22 38V120C42 116 64 120 80 130Z"/><path data-m="b" d="M80 46C96 36 118 34 138 38V120C118 116 96 120 80 130Z"/><g data-m="ink"><path d="M14 50V130C40 124 62 128 80 138C98 128 120 124 146 130V50"/><path d="M80 46C64 36 42 34 22 38V120C42 116 64 120 80 130ZM80 46C96 36 118 34 138 38V120C118 116 96 120 80 130Z"/><path d="M34 56C46 54 58 56 68 62M34 72C46 70 58 72 68 78M34 88C46 86 58 88 68 94M92 62C102 56 114 54 126 56M92 78C102 72 114 70 126 72"/></g>'],
  vase: ['pottery potter ceramics ceramic ceramicist stoneware porcelain kiln glaze glazes vase vases jug studio crockery tableware', '<ellipse data-m="b" cx="80" cy="140" rx="44" ry="6"/><path data-m="a" d="M60 22H100V32C100 42 92 44 92 52C116 64 126 86 120 108C116 126 102 138 80 138C58 138 44 126 40 108C34 86 44 64 68 52C68 44 60 42 60 32Z"/><path data-m="b" d="M38 86H122L121 100H39Z"/><g data-m="ink"><path d="M60 22H100V32C100 42 92 44 92 52C116 64 126 86 120 108C116 126 102 138 80 138C58 138 44 126 40 108C34 86 44 64 68 52C68 44 60 42 60 32Z"/><path d="M60 32H100M38 86H122M39 100H121"/></g>'],
  bag: ['bag bags packet parcel shop shops store retail boutique market shopping brand goods homeware maker makers candle candles jewellery online boutiques', '<path data-m="a" d="M32 56H128L136 142H24Z"/><path data-m="b" d="M30 74H130L131 86H29Z"/><g data-m="ink"><path d="M32 56H128L136 142H24Z"/><path d="M58 56V44A22 22 0 0 1 102 44V56"/></g><circle data-m="dot" cx="58" cy="66" r="3.5"/><circle data-m="dot" cx="102" cy="66" r="3.5"/>'],
  boat: ['boat boats ferry ferries sailing sail sailboat yacht harbour harbor marina boatyard cruise cruises fishing kayak canoe river coast coastal island', '<path data-m="b" d="M86 28L126 100H86Z"/><path data-m="b" d="M74 44V100H40Z"/><path data-m="a" d="M26 108H134L120 130H40Z"/><g data-m="ink"><path d="M80 22V108"/><path d="M86 28L126 100H86ZM74 44V100H40Z"/><path d="M26 108H134L120 130H40Z"/><path d="M14 142C24 136 34 136 44 142S64 148 74 142S94 136 104 142S124 148 134 142S144 138 148 140"/></g>'],
  bus: ['bus buses tram trams transport transit commute commuters route routes timetable timetables shuttle minibus', '<rect data-m="a" x="26" y="30" width="108" height="94" rx="14"/><rect data-m="b" x="38" y="44" width="84" height="38" rx="4"/><circle data-m="b" cx="46" cy="104" r="7"/><circle data-m="b" cx="114" cy="104" r="7"/><g data-m="ink"><rect x="26" y="30" width="108" height="94" rx="14"/><rect x="38" y="44" width="84" height="38" rx="4"/><path d="M80 44V82M62 36H98M26 52H18V72M134 52H142V72"/><circle cx="46" cy="104" r="7"/><circle cx="114" cy="104" r="7"/><path d="M64 106H96"/></g><rect data-m="dot" x="38" y="124" width="16" height="14" rx="3"/><rect data-m="dot" x="106" y="124" width="16" height="14" rx="3"/>'],
  train: ['train trains rail railway railways station stations metro underground subway tube locomotive commuter platform', '<path data-m="a" d="M40 126V54C40 36 56 24 80 24S120 36 120 54V126Z"/><path data-m="b" d="M52 58C52 48 64 40 80 40S108 48 108 58V78H52Z"/><circle data-m="b" cx="58" cy="102" r="7"/><circle data-m="b" cx="102" cy="102" r="7"/><g data-m="ink"><path d="M40 126V54C40 36 56 24 80 24S120 36 120 54V126Z"/><path d="M52 58C52 48 64 40 80 40S108 48 108 58V78H52Z"/><circle cx="58" cy="102" r="7"/><circle cx="102" cy="102" r="7"/><path d="M40 126H120M52 126L34 148M108 126L126 148M44 138H116M38 146H122"/></g>'],
  bike: ['bike bikes bicycle bicycles cycling cyclist cycle cycles ride rides courier couriers', '<circle data-m="b" cx="42" cy="104" r="28"/><circle data-m="b" cx="118" cy="104" r="28"/><circle data-m="a" cx="78" cy="104" r="8"/><path data-m="a" d="M56 52H80L76 60H58Z"/><g data-m="ink"><circle cx="42" cy="104" r="28"/><circle cx="118" cy="104" r="28"/><path d="M42 104L66 64H108L78 104ZM66 64L78 104M108 64L118 104M102 46H116M108 64L104 46M68 60L66 64"/><circle cx="78" cy="104" r="8"/></g><circle data-m="dot" cx="42" cy="104" r="4"/><circle data-m="dot" cx="118" cy="104" r="4"/>'],
  van: ['van vans delivery deliveries removals removal courier couriers haulage logistics moving shipping parcel parcels dispatch fleet', '<path data-m="a" d="M16 116V64C16 56 22 50 30 50H100L124 74L142 80V116Z"/><path data-m="b" d="M104 58L120 76H104Z"/><path data-m="b" d="M16 90H142V98H16Z"/><circle data-m="cut" cx="46" cy="118" r="13"/><circle data-m="cut" cx="114" cy="118" r="13"/><g data-m="ink"><path d="M16 116V64C16 56 22 50 30 50H100L124 74L142 80V116H127M101 116H59M33 116H16"/><path d="M104 58L120 76H104ZM100 50V116"/><circle cx="46" cy="118" r="13"/><circle cx="114" cy="118" r="13"/><path d="M8 140H152"/></g><circle data-m="dot" cx="46" cy="118" r="4"/><circle data-m="dot" cx="114" cy="118" r="4"/>'],
  paw: ['pet pets dog dogs cat cats puppy kitten vet vets veterinary groomer grooming walker kennel kennels cattery animal animals', '<path data-m="a" d="M80 136C60 136 46 124 50 108C54 94 66 88 80 88S106 94 110 108C114 124 100 136 80 136Z"/><g data-m="b"><ellipse cx="44" cy="80" rx="11" ry="15" transform="rotate(-24 44 80)"/><ellipse cx="66" cy="54" rx="11" ry="15" transform="rotate(-8 66 54)"/><ellipse cx="94" cy="54" rx="11" ry="15" transform="rotate(8 94 54)"/><ellipse cx="116" cy="80" rx="11" ry="15" transform="rotate(24 116 80)"/></g><g data-m="ink"><path d="M80 136C60 136 46 124 50 108C54 94 66 88 80 88S106 94 110 108C114 124 100 136 80 136Z"/><ellipse cx="44" cy="80" rx="11" ry="15" transform="rotate(-24 44 80)"/><ellipse cx="66" cy="54" rx="11" ry="15" transform="rotate(-8 66 54)"/><ellipse cx="94" cy="54" rx="11" ry="15" transform="rotate(8 94 54)"/><ellipse cx="116" cy="80" rx="11" ry="15" transform="rotate(24 116 80)"/></g>'],
  mountain: ['mountain mountains outdoor outdoors camping camp campsite hiking hike walking climbing climb adventure adventures trek trekking ski skiing retreat retreats wilderness alpine expedition', '<path data-m="b" d="M64 126L102 54L144 126Z"/><path data-m="a" d="M14 126L62 38L110 126Z"/><path data-m="b" d="M62 38L49 62L57 58L63 66L71 58L76 62Z"/><circle data-m="b" cx="124" cy="36" r="11"/><g data-m="ink"><path d="M64 126L102 54L144 126M14 126L62 38L110 126Z"/><path d="M49 62L57 58L63 66L71 58L76 62"/><circle cx="124" cy="36" r="11"/><path d="M6 126H154"/></g>'],
  suitcase: ['travel traveller travellers trip trips holiday holidays luggage suitcase flight flights airline airport tour tours tourism tourist getaway journey abroad visa', '<rect data-m="a" x="34" y="50" width="92" height="84" rx="10"/><rect data-m="b" x="52" y="50" width="10" height="84"/><rect data-m="b" x="98" y="50" width="10" height="84"/><g data-m="ink"><rect x="34" y="50" width="92" height="84" rx="10"/><path d="M62 50V36C62 32 64 30 68 30H92C96 30 98 32 98 36V50M52 50V134M62 50V134M98 50V134M108 50V134"/></g><circle data-m="dot" cx="48" cy="142" r="5"/><circle data-m="dot" cx="112" cy="142" r="5"/>'],
  pin: ['map maps location locations directions find visit address branch branches near local area region places venue venues destination route', '<path data-m="b" d="M18 110L56 98L104 110L142 98V138L104 150L56 138L18 150Z"/><path data-m="a" d="M80 124C80 124 44 88 44 60A36 36 0 0 1 116 60C116 88 80 124 80 124Z"/><circle data-m="cut" cx="80" cy="60" r="13"/><g data-m="ink"><path d="M18 110L56 98L104 110L142 98V138L104 150L56 138L18 150Z"/><path d="M56 98V138M104 110V150"/><path d="M80 124C80 124 44 88 44 60A36 36 0 0 1 116 60C116 88 80 124 80 124Z"/><circle cx="80" cy="60" r="13"/></g>'],
  pencil: ['design designer designers illustrator illustration illustrations branding brand sketch drawing draw art artist artists stationery pencil pencils writing writer writers essays journal blog homework classroom architect drafting kids children childrens pupils phonics nursery nurseries', '<rect data-m="b" x="14" y="118" width="132" height="24" rx="3"/><g transform="rotate(-38 80 74)"><rect data-m="a" x="34" y="62" width="76" height="24" rx="2"/><rect data-m="b" x="22" y="62" width="12" height="24"/><path data-m="b" d="M110 62L136 74L110 86Z"/><path data-m="dot" d="M128 70L136 74L128 78Z"/><g data-m="ink"><path d="M22 62H110L136 74L110 86H22C16 86 14 82 14 74S16 62 22 62ZM34 62V86M110 62V86"/></g></g><g data-m="ink"><rect x="14" y="118" width="132" height="24" rx="3"/><path d="M28 118V128M42 118V124M56 118V128M70 118V124M84 118V128M98 118V124M112 118V128M126 118V124"/></g>'],
  stethoscope: ['health healthcare clinic clinics doctor doctors gp surgery medical medicine physio physiotherapy physiotherapist therapy therapist patient patients care nursing practice hospital osteopath chiropractor midwife', '<circle data-m="a" cx="118" cy="96" r="16"/><circle data-m="b" cx="118" cy="96" r="7"/><g data-m="ink"><path d="M50 22V40C50 62 62 76 80 76S110 62 110 40V22"/><path d="M80 76V100C80 122 96 134 108 130C116 127 118 120 118 112"/><circle cx="118" cy="96" r="16"/><circle cx="118" cy="96" r="7"/></g><circle data-m="dot" cx="50" cy="20" r="5"/><circle data-m="dot" cx="110" cy="20" r="5"/>'],
  glasses: ['glasses optician opticians optometrist optical eyewear spectacles lenses eye eyes sight vision', '<circle data-m="b" cx="50" cy="92" r="27"/><circle data-m="b" cx="110" cy="92" r="27"/><path data-m="a" d="M18 78C18 64 30 58 50 58C64 58 72 62 76 70H84C88 62 96 58 110 58C130 58 142 64 142 78V84H118C112 76 104 72 96 74L84 78H76L64 74C56 72 48 76 42 84H18Z"/><g data-m="ink"><circle cx="50" cy="92" r="27"/><circle cx="110" cy="92" r="27"/><path d="M18 78C18 64 30 58 50 58C64 58 72 62 76 70H84C88 62 96 58 110 58C130 58 142 64 142 78M76 70V80M84 70V80M38 84A16 16 0 0 1 48 78M98 84A16 16 0 0 1 108 78"/></g>'],
  mic: ['podcast podcasts radio music musician musicians audio sound recording studio singer singing band bands choir dj karaoke comedy talk talks speaker speakers voice microphone live', '<rect data-m="a" x="58" y="18" width="44" height="72" rx="22"/><rect data-m="b" x="58" y="50" width="44" height="10"/><rect data-m="b" x="56" y="132" width="48" height="10" rx="5"/><g data-m="ink"><rect x="58" y="18" width="44" height="72" rx="22"/><path d="M58 50H102M58 60H102M44 68C44 92 60 106 80 106S116 92 116 68M80 106V132"/><rect x="56" y="132" width="48" height="10" rx="5"/></g>'],
  camera: ['photography photographer photographers photo photos photograph camera cameras film filmmaker filmmaking videographer video videos wedding weddings portrait portraits shoot', '<path data-m="b" d="M58 52L66 36H94L102 52Z"/><rect data-m="a" x="20" y="52" width="120" height="80" rx="12"/><circle data-m="b" cx="80" cy="92" r="28"/><circle data-m="a" cx="80" cy="92" r="14"/><rect data-m="b" x="112" y="62" width="16" height="9" rx="2"/><g data-m="ink"><path d="M58 52L66 36H94L102 52"/><rect x="20" y="52" width="120" height="80" rx="12"/><circle cx="80" cy="92" r="28"/><circle cx="80" cy="92" r="14"/><rect x="112" y="62" width="16" height="9" rx="2"/><path d="M32 52V44H46V52"/></g><circle data-m="dot" cx="74" cy="86" r="3"/>'],
  pot: ['plant plants houseplant houseplants pot pots planter succulent cactus garden centre greenhouse indoor nursery', '<path data-m="b" d="M80 90C80 62 66 46 44 42C44 66 58 84 80 90Z"/><path data-m="b" d="M80 90C80 58 96 38 120 34C120 62 104 84 80 90Z"/><path data-m="a" d="M48 100H112L104 142H56Z"/><rect data-m="a" x="40" y="88" width="80" height="16" rx="3"/><g data-m="ink"><path d="M80 90C80 62 66 46 44 42C44 66 58 84 80 90ZM80 90C80 58 96 38 120 34C120 62 104 84 80 90Z"/><path d="M80 90V60M64 68L80 84M100 56L80 78"/><path d="M48 104L56 142H104L112 104"/><rect x="40" y="88" width="80" height="16" rx="3"/></g>'],
  hanger: ['fashion clothing clothes apparel wardrobe garment garments knitwear dress dresses shirt shirts tailor boutique stylist laundry dry cleaning dry cleaner wear', '<path data-m="a" d="M38 92L58 82H102L122 92L140 116L122 124L116 110V146H44V110L38 124L20 116Z"/><path data-m="b" d="M44 120H116V130H44Z"/><g data-m="ink"><path d="M38 92L58 82H102L122 92L140 116L122 124L116 110V146H44V110L38 124L20 116Z"/><path d="M68 82C70 92 90 92 92 82"/><path d="M74 30C74 22 80 18 86 18S96 24 94 30C92 36 82 38 80 46V58M80 58L26 88H134Z"/></g>'],
  envelope: ['newsletter newsletters email emails mail post letter letters inbox message messages contact correspondence invitation invitations stationery', '<rect data-m="b" x="20" y="40" width="120" height="86" rx="6"/><rect data-m="a" x="106" y="50" width="22" height="26" rx="2"/><g data-m="ink"><rect x="20" y="40" width="120" height="86" rx="6"/><path d="M20 46L80 92L140 46M20 126L64 88M140 126L96 88"/><rect x="106" y="50" width="22" height="26" rx="2"/></g><circle data-m="dot" cx="80" cy="92" r="6"/>'],
  calendar: ['calendar calendars schedule scheduling booking bookings appointment appointments date dates diary planner timetable rota agenda programme term terms', '<rect data-m="b" x="26" y="34" width="108" height="104" rx="10"/><path data-m="a" d="M26 62V44A10 10 0 0 1 36 34H124A10 10 0 0 1 134 44V62Z"/><circle data-m="a" cx="102" cy="100" r="10"/><g data-m="ink"><rect x="26" y="34" width="108" height="104" rx="10"/><path d="M26 62H134M54 24V44M106 24V44"/><circle cx="102" cy="100" r="10"/></g><g data-m="dot"><circle cx="46" cy="80" r="3.5"/><circle cx="64" cy="80" r="3.5"/><circle cx="82" cy="80" r="3.5"/><circle cx="102" cy="80" r="3.5"/><circle cx="118" cy="80" r="3.5"/><circle cx="46" cy="100" r="3.5"/><circle cx="64" cy="100" r="3.5"/><circle cx="82" cy="100" r="3.5"/><circle cx="118" cy="100" r="3.5"/><circle cx="46" cy="120" r="3.5"/><circle cx="64" cy="120" r="3.5"/><circle cx="82" cy="120" r="3.5"/></g>'],
  coins: ['money payments payment pay payroll savings saving budget budgets lending loan loans credit cash pension pensions fund funds wealth wages salary tips treasury coin coins crypto fintech', '<path data-m="a" d="M30 66V122A30 10 0 0 0 90 122V66Z"/><ellipse data-m="b" cx="60" cy="66" rx="30" ry="10"/><path data-m="a" d="M84 98V126A24 8 0 0 0 132 126V98Z"/><ellipse data-m="b" cx="108" cy="98" rx="24" ry="8"/><g data-m="ink"><ellipse cx="60" cy="66" rx="30" ry="10"/><path d="M30 66V122A30 10 0 0 0 90 122V66M30 80A30 10 0 0 0 90 80M30 94A30 10 0 0 0 90 94M30 108A30 10 0 0 0 90 108"/><ellipse cx="108" cy="98" rx="24" ry="8"/><path d="M84 98V126A24 8 0 0 0 132 126V98M84 112A24 8 0 0 0 132 112"/></g>'],
  terminal: ['developer developers devtool devtools code coding api apis cli sdk git deploy deployment software engineer engineering programming terminal command script scripts webhooks open source', '<rect data-m="b" x="18" y="30" width="124" height="100" rx="10"/><path data-m="a" d="M18 52V40A10 10 0 0 1 28 30H132A10 10 0 0 1 142 40V52Z"/><rect data-m="a" x="58" y="84" width="12" height="14"/><g data-m="ink"><rect x="18" y="30" width="124" height="100" rx="10"/><path d="M18 52H142M34 74L46 84L34 94M34 114H96M104 114H124"/></g><g data-m="dot"><circle cx="32" cy="41" r="3.5"/><circle cx="44" cy="41" r="3.5"/><circle cx="56" cy="41" r="3.5"/></g>'],
  server: ['hosting host server servers database databases infrastructure cloud kubernetes serverless edge cdn storage backup backups data centre datacenter uptime status platform network networks monitoring telemetry logs logging observability queue', '<rect data-m="b" x="30" y="26" width="100" height="30" rx="6"/><rect data-m="a" x="30" y="64" width="100" height="30" rx="6"/><rect data-m="b" x="30" y="102" width="100" height="30" rx="6"/><g data-m="ink"><rect x="30" y="26" width="100" height="30" rx="6"/><rect x="30" y="64" width="100" height="30" rx="6"/><rect x="30" y="102" width="100" height="30" rx="6"/><path d="M90 41H116M90 79H116M90 117H116M80 132V144M44 144H116"/></g><g data-m="dot"><circle cx="46" cy="41" r="4"/><circle cx="46" cy="79" r="4"/><circle cx="46" cy="117" r="4"/></g>'],
  lens: ['search research insight insights audit audits inspection inspections survey surveys investigation investigations analysis review reviews discovery find seo analytics bi', '<circle data-m="b" cx="66" cy="66" r="40"/><path data-m="a" d="M96 88L140 132L130 142L86 98Z"/><g data-m="ink"><circle cx="66" cy="66" r="40"/><path d="M96 88L140 132L130 142L86 98M40 60A28 28 0 0 1 60 40"/></g><g data-m="a"><rect x="50" y="68" width="8" height="16"/><rect x="62" y="58" width="8" height="26"/><rect x="74" y="50" width="8" height="34"/></g>'],
  lock: ['security secure privacy private encryption compliance governance protection protect password passwords login identity access safe vault', '<path data-m="b" d="M48 72V52A32 32 0 0 1 112 52V72H100V52A20 20 0 0 0 60 52V72Z"/><rect data-m="a" x="34" y="70" width="92" height="72" rx="12"/><circle data-m="cut" cx="80" cy="100" r="9"/><rect data-m="cut" x="76" y="104" width="8" height="18" rx="2"/><g data-m="ink"><path d="M48 70V52A32 32 0 0 1 112 52V70M60 70V52A20 20 0 0 1 100 52V70"/><rect x="34" y="70" width="92" height="72" rx="12"/><circle cx="80" cy="100" r="9"/><path d="M76 108V122H84V108"/></g>'],
  box: ['box boxes parcel parcels package packaging shipping logistics warehouse warehousing supply chain fulfilment fulfillment wholesale manufacturing stock inventory orders order', '<path data-m="b" d="M80 28L136 54L80 80L24 54Z"/><path data-m="a" d="M24 54L80 80V140L24 114Z"/><path data-m="a" d="M136 54L80 80V140L136 114Z"/><path data-m="b" d="M98 104L122 92V106L98 118Z"/><g data-m="ink"><path d="M80 28L136 54V114L80 140L24 114V54ZM24 54L80 80L136 54M80 80V140M52 41L108 67"/><path d="M98 104L122 92V106L98 118Z"/></g>'],
  gift: ['gift gifts present presents party parties birthday birthdays celebration toys toy hamper hampers vouchers voucher christmas', '<rect data-m="a" x="32" y="72" width="96" height="66" rx="2"/><rect data-m="a" x="24" y="54" width="112" height="20" rx="3"/><rect data-m="b" x="72" y="54" width="16" height="84"/><path data-m="b" d="M80 54C66 30 44 34 54 48C58 54 70 54 80 54Z"/><path data-m="b" d="M80 54C94 30 116 34 106 48C102 54 90 54 80 54Z"/><g data-m="ink"><rect x="32" y="74" width="96" height="64" rx="2"/><rect x="24" y="54" width="112" height="20" rx="3"/><path d="M72 54V138M88 54V138"/><path d="M80 54C66 30 44 34 54 48C58 54 70 54 80 54ZM80 54C94 30 116 34 106 48C102 54 90 54 80 54Z"/></g>'],
  jar: ['charity charities donate donation donations fundraising fundraiser volunteer volunteers volunteering nonprofit non-profit foundation foodbank community giving aid trust campaign cause jar jars collection appeal', '<circle data-m="b" cx="80" cy="22" r="11"/><rect data-m="b" x="50" y="38" width="60" height="14" rx="4"/><rect data-m="a" x="36" y="52" width="88" height="90" rx="18"/><rect data-m="b" x="52" y="78" width="56" height="38" rx="4"/><g data-m="ink"><circle cx="80" cy="22" r="11"/><path d="M74 22H86"/><rect x="50" y="38" width="60" height="14" rx="4"/><path d="M70 45H90"/><rect x="36" y="52" width="88" height="90" rx="18"/><rect x="52" y="78" width="56" height="38" rx="4"/><path d="M80 108V92M80 100C74 100 70 96 70 90C76 90 80 94 80 100ZM80 96C80 90 84 86 90 86C90 92 86 96 80 96Z"/></g>'],
  chat: ['chat chats messaging message messages social community communities forum forums conversation conversations dating friends friend creator creators fans meetup meetups support helpdesk', '<path data-m="a" d="M32 30H106A10 10 0 0 1 116 40V84A10 10 0 0 1 106 94H58L38 110V94H32A10 10 0 0 1 22 84V40A10 10 0 0 1 32 30Z"/><path data-m="ink" d="M32 30H106A10 10 0 0 1 116 40V84A10 10 0 0 1 106 94H58L38 110V94H32A10 10 0 0 1 22 84V40A10 10 0 0 1 32 30ZM36 48H96M36 62H54"/><path data-m="b" d="M74 66H128A10 10 0 0 1 138 76V112A10 10 0 0 1 128 122H124V138L106 122H74A10 10 0 0 1 64 112V76A10 10 0 0 1 74 66Z"/><path data-m="ink" d="M74 66H128A10 10 0 0 1 138 76V112A10 10 0 0 1 128 122H124V138L106 122H74A10 10 0 0 1 64 112V76A10 10 0 0 1 74 66Z"/><g data-m="dot"><circle cx="86" cy="94" r="4"/><circle cx="101" cy="94" r="4"/><circle cx="116" cy="94" r="4"/></g>'],
  bottle: ['skincare skin cosmetics cosmetic beauty serum serums oil oils fragrance fragrances perfume perfumes soap soaps lotion apothecary pharmacy chemist wellbeing aromatherapy nail nails manicure makeup make-up', '<path data-m="b" d="M70 52V34C70 26 74 22 80 22S90 26 90 34V52Z"/><rect data-m="b" x="64" y="50" width="32" height="16" rx="2"/><rect data-m="a" x="46" y="64" width="68" height="78" rx="12"/><rect data-m="b" x="56" y="88" width="48" height="32" rx="3"/><path data-m="b" d="M134 96C134 96 124 108 124 116A10 10 0 0 0 144 116C144 108 134 96 134 96Z"/><g data-m="ink"><path d="M70 50V34C70 26 74 22 80 22S90 26 90 34V50"/><rect x="64" y="50" width="32" height="14" rx="2"/><rect x="46" y="64" width="68" height="78" rx="12"/><rect x="56" y="88" width="48" height="32" rx="3"/><path d="M66 100H94M66 110H86"/><path d="M134 96C134 96 124 108 124 116A10 10 0 0 0 144 116C144 108 134 96 134 96Z"/></g>'],
  glass: ['wine wines winery vineyard vineyards bar bars pub pubs cocktail cocktails drinks drink tasting sommelier tavern inn brewery distillery whisky gin spirits nightlife', '<ellipse data-m="b" cx="80" cy="136" rx="26" ry="6"/><path data-m="a" d="M55 50H105C104 72 96 86 80 88C64 86 56 72 55 50Z"/><g data-m="ink"><path d="M52 22H108C110 58 100 86 80 88C60 86 50 58 52 22Z"/><path d="M55 50H105M80 88V134"/><ellipse cx="80" cy="136" rx="26" ry="6"/></g>'],
};

export type MotifName = keyof typeof MOTIFS;

// Words that mean something else beside their neighbour: a "house blend" is coffee, a "key lime" is a pie, a
// "box office" sells tickets, "personal training" is not a railway.
const NOT = /\b(house (blend|wine|special|music|plant|party|style|red|white|band)|key (lime|lime pie|points?|facts?|dates?|stage)|book (now|online|a|your|today|in)|chart (topping)|ticket (price|prices)|tool ?kit|phone (number|call|us)|box (set)|pin (number|code)|nursery (school|schools|class)|lock (in|down)|coach (trip|trips|holiday|holidays|travel|hire)|sound (advice|judgement)|file (a|your)|home (page|pages|screen|screens)|plant (hire))\b/g;
// A keyword matches the word itself, or the word with a plural or trade ending (bake: baker; shop: shops).
const ENDING = /^(s|es|er|ers|ies)$/;
// Words that are never a subject here: the instruction to build, a trainer at a gym.
const STOP = /^(build|trainer|trainers|training)$/;
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fits = (k: string, w: string) => k === w || (k.length > 3 && w.startsWith(k) && ENDING.test(w.slice(k.length))) || (w.length > 3 && k.startsWith(w) && ENDING.test(k.slice(w.length)));

/** Motifs whose keywords match a brief, best first. Earlier words in the brief count more: the subject comes first. */
export function rankMotifs(text: string): string[] {
  const words = `${fold(text)} `.replace(/\bfood banks?\b/g, 'foodbank').replace(/\bbox offices?\b/g, 'boxoffice').replace(NOT, (m) => m.replace(/^\w+ /, '_ ')).split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.test(w));
  const scored: Array<[string, number]> = [];
  for (const [name, [keys]] of Object.entries(MOTIFS)) {
    const list = fold(keys).split(' ');
    const s = words.reduce((acc, w, i) => acc + (list.some((k) => fits(k, w)) ? 1 / (1 + i * 0.08) : 0), 0);
    if (s > 0) scored.push([name, s]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

/** The motif whose keywords best match a brief ("bag of Huila beans on a counter", "law office"), or null. */
export function pickMotif(text: string): string | null {
  return rankMotifs(text)[0] ?? null;
}

/** Inline SVG for a motif: decoration, so hidden from assistive tech (the figcaption says what it shows). */
export function motifSvg(name: string): string {
  const m = MOTIFS[name];
  return m ? `<svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false">${m[1]}</svg>` : '';
}

/**
 * Scenes: two or three motifs composed on one ground for a hero-sized panel ("cup bag" is a counter with a bag
 * and a cup in front of it, "crane house" a building site). The larger thing stands behind, the smaller one in
 * front overlapping it, things that do not stand (a chat bubble, a tooth, a leaf) hang above, and only the first
 * name, the subject, carries the accent. One line per motif (scripts/lib/image-motifs.mjs reads this table too):
 *   name, the drawing's box on the 160 grid (x0 y0 x1 y1), size (1 small, 2 medium, 3 large), pose (stand on
 *   the ground or float above it), ground (counter, line, water, road), companion (shown with it when a brief
 *   names only one thing)
 */
export const SCENE_KIT = `
cup 24 22 140 138 1 stand counter bag
loaf 14 50 146 132 1 stand counter jar
crane 8 14 152 140 3 stand line house
document 42 20 132 140 1 stand line pencil
scales 16 20 144 138 2 stand line book
leaf 41 24 144 150 1 float line pot
phone 46 14 114 146 1 stand line chat
chart 20 20 146 132 2 stand line lens
key 20 52 138 108 1 float line lock
ticket 20 39 139 115 1 float line mic
tool 15 18 148 139 1 float line box
house 12 28 148 136 3 stand line pencil
tooth 34 20 148 140 1 float line calendar
bowl 22 18 138 140 1 stand counter bottle
scissors 36 20 124 134 1 float line bottle
book 14 36 146 138 1 stand counter glasses
vase 36 22 124 146 2 stand counter pot
bag 24 22 136 142 2 stand counter box
boat 14 22 148 147 3 stand water mountain
bus 18 30 142 138 3 stand road pin
train 34 24 126 148 3 stand line suitcase
bike 14 46 146 132 2 stand road mountain
van 8 50 152 140 3 stand road box
paw 28 38 132 136 1 float line bowl
mountain 6 25 154 126 3 stand line bike
suitcase 34 30 126 147 2 stand line pin
pin 18 24 142 150 1 float line suitcase
pencil 14 30 146 142 1 stand counter book
stethoscope 45 15 134 131 1 float line bottle
glasses 18 58 142 119 1 float line book
mic 44 18 116 142 2 stand line ticket
camera 20 36 140 132 1 stand counter mountain
pot 40 34 120 142 1 stand counter vase
hanger 20 18 140 146 1 float line bag
envelope 20 40 140 126 1 float line box
calendar 26 24 134 138 1 stand line ticket
coins 30 56 132 134 1 stand counter chart
terminal 18 30 142 130 2 stand line server
server 30 26 130 144 2 stand line terminal
lens 26 26 140 142 1 float line document
lock 34 20 126 142 1 stand line key
box 24 28 136 140 2 stand counter van
gift 24 37 136 138 1 stand counter box
jar 36 11 124 142 1 stand counter loaf
chat 22 30 138 138 1 float line phone
bottle 46 22 144 142 1 stand counter glass
glass 52 22 108 142 1 stand counter bottle
`;

interface Kit { box: number[]; size: number; float: boolean; ground: string; with: string }
let kit: Record<string, Kit> | null = null;
const sceneKit = (): Record<string, Kit> => (kit ??= Object.fromEntries(SCENE_KIT.trim().split('\n').map((l) => {
  const [n, x0, y0, x1, y1, size, pose, ground, w] = l.trim().split(/\s+/);
  return [n, { box: [+x0, +y0, +x1, +y1], size: +size, float: pose === 'float', ground, with: w }];
})));

/** The motifs for a scene from a brief, the subject first ("bag of beans on a counter" → ['bag', 'cup']), or null. */
export function pickScene(text: string): string[] | null {
  const k = sceneKit();
  const out = rankMotifs(text).filter((n) => k[n]).slice(0, 3);
  if (!out.length) return null;
  if (out.length === 1) out.push(k[out[0]].with);
  // Something must stand on the ground: a scene of floating things is a sticker sheet.
  if (out.every((n) => k[n].float)) {
    const w = [k[out[0]].with, ...out.map((n) => k[n].with)].find((n) => !k[n].float && !out.includes(n));
    if (w) out.splice(Math.min(out.length - 1, 2), out.length === 3 ? 1 : 0, w);
  }
  return out;
}

const r1 = (v: number) => String(Math.round(v * 10) / 10);
const r3 = (v: number) => String(Math.round(v * 1000) / 1000);
const GROUND = 176;
const WAVE = 'q10 -6 20 0t20 0'.repeat(110);
const FLOORS: Record<string, string> = {
  counter: `<rect data-m="floor" x="-2000" y="${GROUND}" width="4320" height="2000"/><path data-m="ink" d="M-2000 ${GROUND}H2320"/>`,
  line: `<path data-m="ink" d="M-2000 ${GROUND}H2320"/>`,
  road: `<rect data-m="floor" x="-2000" y="${GROUND}" width="4320" height="2000"/><path data-m="ink" d="M-2000 ${GROUND}H2320"/><path data-m="ink" data-g="dash" d="M-1996 ${GROUND + 14}H2320"/>`,
  water: `<path data-m="ink" d="M-2000 ${GROUND}${WAVE}"/><path data-m="ink" data-g="thin" d="M-1990 ${GROUND + 12}${WAVE}"/>`,
};

/**
 * A scene's inline SVG (320 × 200, things standing on a ground at y 176) from motif names, "cup bag" or
 * ['crane', 'house']. Unknown names are skipped; three at most. The first name is the subject and the only one
 * in the accent; the rest are drawn in a quieter tone. Every thing keeps the panel's one stroke weight whatever
 * its scale (--k on each group divides --motif-stroke).
 */
export function sceneSvg(list: string | string[]): string {
  const k = sceneKit();
  const names = (typeof list === 'string' ? list.trim().split(/[\s,]+/) : list).filter((n, i, a) => k[n] && MOTIFS[n] && a.indexOf(n) === i).slice(0, 3);
  if (!names.length) return '';
  const all = names.map((n, i) => ({ n, i, ...k[n], s: 1, cx: 0, cy: 0 }));
  type T = typeof all[number];
  const w = (t: T) => (t.box[2] - t.box[0]) * t.s;
  const h = (t: T) => (t.box[3] - t.box[1]) * t.s;
  const stand = all.filter((t) => !t.float).sort((a, b) => b.size - a.size || a.i - b.i);
  const float = all.filter((t) => t.float);
  // Scale by real size: the biggest at full size, the same size a little smaller, a step smaller at two thirds.
  const top = stand.length ? stand[0].size : 0;
  stand.forEach((t, j) => { t.s = j === 0 ? 1 : (top === t.size ? 0.8 : top - t.size === 1 ? 0.64 : 0.48) * (j === 2 ? 0.86 : 1); });
  // The biggest stands behind; the second in front of it on the right, the third on the left, each overlapping it.
  let L = 0, R = 0;
  stand.forEach((t, j) => {
    if (j === 0) { L = -w(t) / 2; R = w(t) / 2; return; }
    const ov = 0.3 * w(t);
    if (j === 1) { t.cx = R - ov + w(t) / 2; R = Math.max(R, t.cx + w(t) / 2); } else { t.cx = L + ov - w(t) / 2; L = Math.min(L, t.cx - w(t) / 2); }
  });
  // Fit the group across the middle, leaving room beside it for anything that floats.
  const room = float.length ? 230 : 288;
  const f = R - L > room ? room / (R - L) : 1;
  const mid = float.length ? 142 : 160;
  stand.forEach((t) => { t.s *= f; t.cx = mid + (t.cx - (L + R) / 2) * f; t.cy = GROUND - h(t) / 2; });
  [L, R] = [mid - ((R - L) / 2) * f, mid + ((R - L) / 2) * f];
  const tall = stand.length ? Math.max(...stand.map(h)) : 0;
  // Floating things hang in the sky: beside the group where there is room, else over its shoulder.
  float.forEach((t, j) => {
    if (!stand.length) { t.s = j === 0 ? 1 : 0.5; t.cx = j === 0 ? 150 : 246; t.cy = j === 0 ? 104 : 50; return; }
    // The subject is drawn larger than anything else that floats.
    t.s = t.i === 0 ? Math.min(0.74, 100 / Math.max(t.box[2] - t.box[0], t.box[3] - t.box[1])) : Math.min(0.56, 76 / Math.max(t.box[2] - t.box[0], t.box[3] - t.box[1]));
    const right = (j === 0) === (320 - R >= L);
    t.cx = right ? Math.min(316 - w(t) / 2, R + w(t) * 0.2) : Math.max(4 + w(t) / 2, L - w(t) * 0.2);
    t.cy = Math.max(6 + h(t) / 2, GROUND - tall * 0.92 - h(t) * 0.2);
  });
  const back = stand[0];
  const sky = back ? `<circle data-m="sky" cx="${r1(back.cx + w(back) * 0.18)}" cy="${r1(GROUND - h(back) * 0.62)}" r="${r1(h(back) * 0.5)}"/>` : '';
  const floor = back ? FLOORS[(all[0].float ? back : all[0]).ground] ?? FLOORS.line : '';
  const g = (t: T) => `<g data-role="${t.i === 0 ? 'lead' : 'rest'}" transform="translate(${r1(t.cx - t.s * (t.box[0] + t.box[2]) / 2)} ${r1(t.cy - t.s * (t.box[1] + t.box[3]) / 2)}) scale(${r3(t.s)})" style="--k:${r3(t.s)}">${MOTIFS[t.n][1]}</g>`;
  // Crop the frame to the things (the ground and the sky run past it), so a tall panel shows them large.
  const xs = all.flatMap((t) => [t.cx - w(t) / 2, t.cx + w(t) / 2]);
  const vw = Math.max(232, Math.max(...xs) - Math.min(...xs) + 40);
  const vx = (Math.max(...xs) + Math.min(...xs)) / 2 - vw / 2;
  // And the empty sky above them (the disc behind the biggest thing included), so they draw larger.
  const tops = [...all.map((t) => t.cy - h(t) / 2), ...(back ? [GROUND - h(back) * 1.12] : [])];
  const vy = Math.max(0, Math.round(Math.min(...tops) - 10));
  return `<svg data-part="scene" viewBox="${r1(vx)} ${vy} ${r1(vw)} ${200 - vy}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${sky}${floor}${stand.map(g).join('')}${float.map(g).join('')}</svg>`;
}

/** data-lt="art-panel": draws the panel's data-motif (or, with data-motif="auto", the one its data-shot names) when the markup does not carry it yet.
 *  data-scene="cup bag" (or a data-motif with two or three names) draws a scene instead; data-scene="auto" picks one from data-shot. */
export function enhance(root: HTMLElement): Cleanup {
  const panels = root.matches('.lt-art') ? [root] : [...root.querySelectorAll<HTMLElement>('.lt-art')];
  const added: Element[] = [];
  for (const el of panels) {
    let name = el.dataset.motif;
    let scene = el.dataset.scene ?? (name && /\s/.test(name.trim()) ? name : undefined);
    if ((!name && !scene) || el.querySelector(':scope > :is([data-part="motif"], [data-part="scene"], img, picture, video)')) continue;
    if (scene) {
      // data-scene="auto": the scene the photo brief describes.
      if (scene === 'auto') { scene = pickScene(el.dataset.shot ?? el.textContent ?? '')?.join(' ') ?? ''; if (!scene) continue; el.dataset.scene = scene; }
      el.insertAdjacentHTML('afterbegin', sceneSvg(scene));
    } else if (name) {
      // data-motif="auto": the drawing that matches the photo brief.
      if (name === 'auto') { name = pickMotif(el.dataset.shot ?? el.textContent ?? '') ?? ''; if (!name) continue; el.dataset.motif = name; }
      el.insertAdjacentHTML('afterbegin', motifSvg(name));
    }
    if (el.firstElementChild?.matches('[data-part="motif"], [data-part="scene"]')) added.push(el.firstElementChild);
  }
  return () => added.forEach((n) => n.remove());
}

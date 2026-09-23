export interface Dish {
  name: string;
  calories: number;   // na 100g
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
  portionG: number;   // sugerowana porcja w gramach
  description: string; // składniki / opis
  category: string;
}

export const POLISH_DISHES: Dish[] = [
  // ── Śniadania ─────────────────────────────────────────────────────────────
  {
    name: 'Jajecznica (2 jajka z masłem)',
    calories: 185, protein: 12, carbs: 1, fat: 15, unit: '100g', portionG: 150,
    category: 'Śniadania',
    description: 'Jajka sadzone/roztrzepane smażone na maśle. Składniki: jajka (2 szt.), masło (10g), sól, pieprz.',
  },
  {
    name: 'Jajecznica z boczkiem',
    calories: 225, protein: 13, carbs: 1, fat: 19, unit: '100g', portionG: 180,
    category: 'Śniadania',
    description: 'Jajka smażone na patelni z boczkiem. Składniki: jajka (2 szt.), boczek (50g), masło, sól, pieprz.',
  },
  {
    name: 'Jajka sadzone (2 szt.)',
    calories: 196, protein: 13, carbs: 0.5, fat: 16, unit: '100g', portionG: 100,
    category: 'Śniadania',
    description: 'Jajka smażone na oliwie lub maśle. Składniki: jajka (2 szt.), oliwa/masło, sól.',
  },
  {
    name: 'Owsianka na mleku',
    calories: 130, protein: 5, carbs: 22, fat: 3, unit: '100g', portionG: 300,
    category: 'Śniadania',
    description: 'Płatki owsiane gotowane na mleku 2%. Składniki: płatki owsiane (50g), mleko 2% (250ml).',
  },
  {
    name: 'Owsianka z owocami i miodem',
    calories: 145, protein: 4.5, carbs: 27, fat: 2.5, unit: '100g', portionG: 350,
    category: 'Śniadania',
    description: 'Owsianka z bananem, jagodami i łyżką miodu. Składniki: płatki (50g), mleko (250ml), banan, jagody, miód.',
  },
  {
    name: 'Kanapka z masłem i szynką',
    calories: 235, protein: 12, carbs: 27, fat: 9, unit: '100g', portionG: 120,
    category: 'Śniadania',
    description: 'Chleb pszenny z masłem i szynką drobiową. Składniki: chleb (2 kromki), masło, szynka (40g), opcjonalnie sałata, pomidor.',
  },
  {
    name: 'Kanapka z twarogiem i rzodkiewką',
    calories: 175, protein: 10, carbs: 24, fat: 4, unit: '100g', portionG: 130,
    category: 'Śniadania',
    description: 'Chleb z twarogiem, rzodkiewką i szczypiorkiem. Składniki: chleb (2 kromki), twaróg półtłusty (60g), rzodkiewka, szczypiorek.',
  },
  {
    name: 'Naleśniki (2 szt.) bez nadzienia',
    calories: 215, protein: 7, carbs: 30, fat: 8, unit: '100g', portionG: 200,
    category: 'Śniadania',
    description: 'Cienkie naleśniki. Składniki: mąka (100g), jajko, mleko (200ml), masło, szczypta soli.',
  },
  {
    name: 'Naleśniki z twarogiem',
    calories: 205, protein: 9, carbs: 26, fat: 8, unit: '100g', portionG: 250,
    category: 'Śniadania',
    description: 'Naleśniki nadziewane twarogiem z cukrem i wanilią. Składniki: naleśniki (2 szt.), twaróg (100g), cukier, wanilia.',
  },
  {
    name: 'Tost z jajkiem sadzonym',
    calories: 245, protein: 12, carbs: 24, fat: 11, unit: '100g', portionG: 150,
    category: 'Śniadania',
    description: 'Tost z pieczywa tostowego z jajkiem sadzonym. Składniki: chleb tostowy (2 kromki), jajko, masło, sól.',
  },
  {
    name: 'Granola z jogurtem greckim',
    calories: 180, protein: 8, carbs: 24, fat: 5, unit: '100g', portionG: 250,
    category: 'Śniadania',
    description: 'Granola z jogurtem greckim 2% i owocami. Składniki: granola (50g), jogurt grecki (150g), owoce sezonowe.',
  },
  {
    name: 'Omlet (2 jajka)',
    calories: 170, protein: 12, carbs: 2, fat: 13, unit: '100g', portionG: 170,
    category: 'Śniadania',
    description: 'Omlet z 2 jajek. Składniki: jajka (2 szt.), masło (10g), sól, pieprz. Opcjonalnie: ser, warzywa.',
  },

  // ── Zupy ──────────────────────────────────────────────────────────────────
  {
    name: 'Rosół z kurczaka',
    calories: 35, protein: 3.5, carbs: 1.5, fat: 1.5, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Klasyczny rosół z kurczaka. Składniki: kurczak, marchew, pietruszka, seler, cebula, por, ziele angielskie, liść laurowy.',
  },
  {
    name: 'Zupa pomidorowa z ryżem',
    calories: 65, protein: 2.5, carbs: 10, fat: 1.5, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Zupa pomidorowa gotowana na wywarze z kurczaka. Składniki: pomidory/koncentrat, ryż, śmietana, wywar mięsny, przyprawy.',
  },
  {
    name: 'Żurek z jajkiem i kiełbasą',
    calories: 95, protein: 5, carbs: 7, fat: 5, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Żurek na zakwasie żytnim z jajkiem i białą kiełbasą. Składniki: zakwas żytni, biała kiełbasa, jajko, czosnek, majeranek, śmietana.',
  },
  {
    name: 'Barszcz czerwony czysty',
    calories: 35, protein: 1, carbs: 7, fat: 0.3, unit: '100g', portionG: 350,
    category: 'Zupy',
    description: 'Czysty barszcz z buraków. Składniki: buraki, wywar warzywny, ocet, cukier, czosnek, przyprawy.',
  },
  {
    name: 'Barszcz z uszkami',
    calories: 70, protein: 3, carbs: 12, fat: 1.5, unit: '100g', portionG: 450,
    category: 'Zupy',
    description: 'Barszcz czerwony z uszkami nadziewanymi grzybami i kapustą. Składniki: barszcz, uszka (6–8 szt.), grzyby, kapusta, cebula.',
  },
  {
    name: 'Zupa grzybowa',
    calories: 55, protein: 2, carbs: 8, fat: 1.5, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Zupa z suszonych grzybów leśnych. Składniki: grzyby suszone, wywar, cebula, śmietana, mąka, przyprawy.',
  },
  {
    name: 'Zupa ogórkowa',
    calories: 50, protein: 2, carbs: 7, fat: 1.5, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Zupa z kiszonych ogórków na wywarze mięsnym. Składniki: ogórki kiszone, ziemniaki, marchew, śmietana, koperek.',
  },
  {
    name: 'Krupnik',
    calories: 75, protein: 4, carbs: 11, fat: 2, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Zupa z kaszą pęczak i warzywami. Składniki: kasza pęczak, marchew, pietruszka, seler, ziemniaki, wywar mięsny.',
  },
  {
    name: 'Zupa grochowa z boczkiem',
    calories: 110, protein: 6, carbs: 14, fat: 3.5, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Gęsta zupa z grochu z wędzonym boczkiem. Składniki: groch łupany, boczek wędzony, marchew, cebula, majeranek.',
  },
  {
    name: 'Kapuśniak',
    calories: 70, protein: 4, carbs: 8, fat: 2.5, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Zupa z kiszonej kapusty z żeberkami. Składniki: kapusta kiszona, żeberka, marchew, ziemniaki, cebula, kminek.',
  },
  {
    name: 'Zupa jarzynowa',
    calories: 50, protein: 2, carbs: 9, fat: 1, unit: '100g', portionG: 400,
    category: 'Zupy',
    description: 'Lekka zupa warzywna. Składniki: marchew, pietruszka, seler, ziemniaki, por, fasolka szparagowa, kapusta, koperek.',
  },

  // ── Dania główne ──────────────────────────────────────────────────────────
  {
    name: 'Kotlet schabowy z ziemniakami',
    calories: 260, protein: 18, carbs: 22, fat: 11, unit: '100g', portionG: 350,
    category: 'Dania główne',
    description: 'Panierowany kotlet wieprzowy z ziemniakami i surówką. Składniki: schab (150g), bułka tarta, jajko, mąka, ziemniaki (200g), tłuszcz do smażenia.',
  },
  {
    name: 'Kotlet mielony',
    calories: 240, protein: 15, carbs: 12, fat: 14, unit: '100g', portionG: 150,
    category: 'Dania główne',
    description: 'Kotlet z mielonej wieprzowiny lub mieszanki mięs. Składniki: mięso mielone, cebula, jajko, bułka tarta, sól, pieprz, majeranek.',
  },
  {
    name: 'Bigos',
    calories: 100, protein: 7, carbs: 5, fat: 6, unit: '100g', portionG: 400,
    category: 'Dania główne',
    description: 'Tradycyjny bigos z kiszonej i świeżej kapusty z mięsem. Składniki: kapusta kiszona, kapusta świeża, kiełbasa, boczek, grzyby, pomidory, cebula, przyprawy.',
  },
  {
    name: 'Pierogi ruskie (6 szt.)',
    calories: 175, protein: 6, carbs: 27, fat: 5, unit: '100g', portionG: 300,
    category: 'Dania główne',
    description: 'Pierogi z nadzieniem z ziemniaków i twarogu. Składniki: ciasto (mąka, jajko), nadzienie: ziemniaki, twaróg, cebula smażona, sól, pieprz.',
  },
  {
    name: 'Pierogi z mięsem (6 szt.)',
    calories: 195, protein: 9, carbs: 25, fat: 6.5, unit: '100g', portionG: 300,
    category: 'Dania główne',
    description: 'Pierogi z nadzieniem mięsnym. Składniki: ciasto (mąka, jajko), mięso mielone wieprzowo-wołowe, cebula, przyprawy.',
  },
  {
    name: 'Pierogi z kapustą i grzybami (6 szt.)',
    calories: 165, protein: 5, carbs: 28, fat: 4, unit: '100g', portionG: 300,
    category: 'Dania główne',
    description: 'Pierogi wigilijne z kapustą i grzybami. Składniki: ciasto, kapusta kiszona, grzyby suszone, cebula, masło, sól, pieprz.',
  },
  {
    name: 'Kopytka z okrasą',
    calories: 190, protein: 5, carbs: 34, fat: 5, unit: '100g', portionG: 300,
    category: 'Dania główne',
    description: 'Kluski ziemniaczane z okrasą ze skwarkami. Składniki: ziemniaki gotowane, mąka, jajko, boczek/cebula smażona, sól.',
  },
  {
    name: 'Gołąbki w sosie pomidorowym',
    calories: 125, protein: 8, carbs: 11, fat: 5, unit: '100g', portionG: 350,
    category: 'Dania główne',
    description: 'Liście kapusty nadziewane ryżem i mięsem mielonym w sosie pomidorowym. Składniki: kapusta, ryż, mięso mielone, cebula, sos pomidorowy.',
  },
  {
    name: 'Flaki wołowe',
    calories: 80, protein: 7, carbs: 5, fat: 4, unit: '100g', portionG: 350,
    category: 'Dania główne',
    description: 'Zupa z flaków wołowych. Składniki: flaki wołowe, marchew, pietruszka, seler, majeranek, imbir, papryka, natka pietruszki.',
  },
  {
    name: 'Gulasz wieprzowy z kaszą',
    calories: 175, protein: 13, carbs: 18, fat: 6, unit: '100g', portionG: 400,
    category: 'Dania główne',
    description: 'Gulasz z wieprzowiny z kaszą gryczaną. Składniki: łopatka wieprzowa, cebula, papryka, pomidory, kasza gryczana, papryka w proszku.',
  },
  {
    name: 'Zrazy wołowe z kaszą',
    calories: 165, protein: 14, carbs: 16, fat: 5, unit: '100g', portionG: 350,
    category: 'Dania główne',
    description: 'Rolady wołowe w ciemnym sosie z kaszą. Składniki: wołowina, boczek, ogórek, musztarda, kasza gryczana, cebula.',
  },
  {
    name: 'Schabowy z kapustą i ziemniakami',
    calories: 245, protein: 17, carbs: 20, fat: 10, unit: '100g', portionG: 450,
    category: 'Dania główne',
    description: 'Obiad wielkanocny — schab z gotowaną kapustą i ziemniakami. Składniki: schab pieczony, kapusta biała duszona, ziemniaki gotowane.',
  },
  {
    name: 'Kurczak pieczony z ziemniakami',
    calories: 185, protein: 18, carbs: 15, fat: 6, unit: '100g', portionG: 400,
    category: 'Dania główne',
    description: 'Kurczak pieczony z ziemniakami i rozmarynem. Składniki: udko kurczaka, ziemniaki, czosnek, rozmaryn, oliwa, sól, pieprz.',
  },
  {
    name: 'Ryba w panierce (dorsz)',
    calories: 195, protein: 18, carbs: 12, fat: 8, unit: '100g', portionG: 200,
    category: 'Dania główne',
    description: 'Filet z dorsza smażony w panierce. Składniki: filet z dorsza, jajko, bułka tarta, mąka, sól, pieprz, tłuszcz do smażenia.',
  },
  {
    name: 'Spaghetti bolognese',
    calories: 160, protein: 9, carbs: 19, fat: 5, unit: '100g', portionG: 400,
    category: 'Dania główne',
    description: 'Makaron spaghetti z sosem bolognese. Składniki: spaghetti (100g), mięso mielone wołowo-wieprzowe, pomidory, cebula, czosnek, oliwa.',
  },
  {
    name: 'Makaron z pesto',
    calories: 235, protein: 8, carbs: 32, fat: 9, unit: '100g', portionG: 300,
    category: 'Dania główne',
    description: 'Makaron z sosem pesto z bazylii. Składniki: makaron (100g), pesto (30g), parmezan, oliwa, czosnek.',
  },
  {
    name: 'Risotto z grzybami',
    calories: 145, protein: 5, carbs: 24, fat: 3.5, unit: '100g', portionG: 350,
    category: 'Dania główne',
    description: 'Kremowe risotto z leśnymi grzybami. Składniki: ryż arborio, grzyby (pieczarki/leśne), bulion, cebula, białe wino, parmezan, masło.',
  },
  {
    name: 'Pizza margherita (ćwiartka)',
    calories: 265, protein: 11, carbs: 33, fat: 10, unit: '100g', portionG: 150,
    category: 'Dania główne',
    description: 'Pizza z sosem pomidorowym i mozzarellą. Składniki: ciasto drożdżowe, sos pomidorowy, mozzarella, bazylia, oliwa.',
  },

  // ── Dania z ryżem/kaszą ───────────────────────────────────────────────────
  {
    name: 'Ryż gotowany',
    calories: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: '100g', portionG: 200,
    category: 'Dodatki',
    description: 'Ryż biały gotowany. Składniki: ryż biały, woda, szczypta soli.',
  },
  {
    name: 'Kasza gryczana gotowana',
    calories: 92, protein: 3.4, carbs: 19, fat: 0.6, unit: '100g', portionG: 200,
    category: 'Dodatki',
    description: 'Kasza gryczana prażona gotowana. Składniki: kasza gryczana, woda, szczypta soli.',
  },
  {
    name: 'Kasza jaglana gotowana',
    calories: 119, protein: 3.5, carbs: 23, fat: 1, unit: '100g', portionG: 200,
    category: 'Dodatki',
    description: 'Kasza jaglana gotowana na wodzie. Składniki: kasza jaglana, woda, szczypta soli.',
  },
  {
    name: 'Ziemniaki gotowane',
    calories: 77, protein: 2, carbs: 17, fat: 0.1, unit: '100g', portionG: 250,
    category: 'Dodatki',
    description: 'Ziemniaki gotowane w wodzie ze skórką lub bez. Składniki: ziemniaki, woda, sól.',
  },
  {
    name: 'Purée ziemniaczane',
    calories: 105, protein: 2.5, carbs: 16, fat: 3.5, unit: '100g', portionG: 250,
    category: 'Dodatki',
    description: 'Puree ziemniaczane z masłem i mlekiem. Składniki: ziemniaki (300g), masło (15g), mleko (50ml), sól, gałka muszkatołowa.',
  },
  {
    name: 'Frytki',
    calories: 312, protein: 3.5, carbs: 41, fat: 15, unit: '100g', portionG: 200,
    category: 'Dodatki',
    description: 'Frytki ziemniaczane smażone w głębokim tłuszczu. Składniki: ziemniaki, tłuszcz do smażenia, sól.',
  },

  // ── Sałatki i surówki ─────────────────────────────────────────────────────
  {
    name: 'Surówka z kapusty',
    calories: 45, protein: 1.5, carbs: 8, fat: 1, unit: '100g', portionG: 150,
    category: 'Sałatki',
    description: 'Surówka z białej kapusty z marchewką. Składniki: kapusta biała, marchew, cebula, ocet, cukier, sól, olej.',
  },
  {
    name: 'Surówka z marchewki',
    calories: 65, protein: 1, carbs: 12, fat: 1.5, unit: '100g', portionG: 150,
    category: 'Sałatki',
    description: 'Surówka z tartej marchewki z jabłkiem. Składniki: marchew, jabłko, cytryna, cukier, olej.',
  },
  {
    name: 'Sałatka grecka',
    calories: 115, protein: 4, carbs: 5, fat: 9, unit: '100g', portionG: 250,
    category: 'Sałatki',
    description: 'Sałatka z warzyw z serem feta i oliwkami. Składniki: ogórek, pomidor, papryka, cebula, ser feta, oliwki, oliwa, oregano.',
  },
  {
    name: 'Sałatka cezar z kurczakiem',
    calories: 140, protein: 10, carbs: 7, fat: 9, unit: '100g', portionG: 300,
    category: 'Sałatki',
    description: 'Sałatka cezar z grillowanym kurczakiem i sosem. Składniki: sałata rzymska, kurczak grillowany, sos cezar, parmezan, grzanki.',
  },
  {
    name: 'Sałatka jarzynowa (śledziowa baza)',
    calories: 125, protein: 3, carbs: 12, fat: 7, unit: '100g', portionG: 200,
    category: 'Sałatki',
    description: 'Klasyczna sałatka jarzynowa z majonezem. Składniki: marchew, pietruszka, ziemniaki, groszek, ogórek, jajka, majonez.',
  },

  // ── Desery ────────────────────────────────────────────────────────────────
  {
    name: 'Sernik na zimno',
    calories: 285, protein: 7, carbs: 28, fat: 16, unit: '100g', portionG: 150,
    category: 'Desery',
    description: 'Sernik bez pieczenia na spodzie z herbatników. Składniki: twaróg, śmietanka, herbatniki, masło, cukier, żelatyna.',
  },
  {
    name: 'Szarlotka',
    calories: 255, protein: 3, carbs: 38, fat: 11, unit: '100g', portionG: 150,
    category: 'Desery',
    description: 'Ciasto z jabłkami. Składniki: mąka, masło, jabłka, cukier, cynamon, jajka.',
  },
  {
    name: 'Makowiec',
    calories: 320, protein: 6, carbs: 45, fat: 13, unit: '100g', portionG: 100,
    category: 'Desery',
    description: 'Drożdżowe ciasto z makiem. Składniki: ciasto drożdżowe, mak, cukier, miód, orzechy, rodzynki, skórka pomarańczowa.',
  },
  {
    name: 'Pączek z różą',
    calories: 340, protein: 5, carbs: 48, fat: 15, unit: '100g', portionG: 80,
    category: 'Desery',
    description: 'Tradycyjny pączek smażony z nadzieniem różanym. Składniki: ciasto drożdżowe, konfitura różana, tłuszcz do smażenia, lukier, skórka pomarańczowa.',
  },
  {
    name: 'Racuchy z jabłkami',
    calories: 230, protein: 5, carbs: 33, fat: 9, unit: '100g', portionG: 200,
    category: 'Desery',
    description: 'Puszyste placuszki z jabłkami. Składniki: mąka, jajka, mleko, jabłka, cukier, drożdże/proszek, tłuszcz do smażenia, cukier puder.',
  },
  {
    name: 'Kisiel owocowy',
    calories: 75, protein: 0.5, carbs: 18, fat: 0.1, unit: '100g', portionG: 200,
    category: 'Desery',
    description: 'Galaretka z mąki ziemniaczanej i soku owocowego. Składniki: mąka ziemniaczana, sok/owoce, cukier, woda.',
  },

  // ── Fast food / przekąski ──────────────────────────────────────────────────
  {
    name: 'Hot dog z bułką',
    calories: 280, protein: 11, carbs: 28, fat: 14, unit: '100g', portionG: 150,
    category: 'Fast food',
    description: 'Parówka w bułce. Składniki: bułka (60g), parówka (70g), musztarda, ketchup.',
  },
  {
    name: 'Zapiekanka',
    calories: 235, protein: 9, carbs: 30, fat: 9, unit: '100g', portionG: 250,
    category: 'Fast food',
    description: 'Polska zapiekanka na bagietce. Składniki: bagietka, pieczarki, ser żółty, ketchup, opcjonalnie: szynka, cebula.',
  },
  {
    name: 'Burger wołowy',
    calories: 295, protein: 16, carbs: 26, fat: 13, unit: '100g', portionG: 200,
    category: 'Fast food',
    description: 'Burger z kotletem wołowym. Składniki: bułka (60g), kotlet wołowy (100g), sałata, pomidor, cebula, sos, ser.',
  },
  {
    name: 'Kebab w tortilli',
    calories: 245, protein: 14, carbs: 25, fat: 10, unit: '100g', portionG: 350,
    category: 'Fast food',
    description: 'Kebab z mięsem drobiowym w tortilli. Składniki: tortilla, mięso z kurczaka, warzywa (sałata, pomidor, ogórek), sos czosnkowy.',
  },

  // ── Napoje ────────────────────────────────────────────────────────────────
  {
    name: 'Kawa z mlekiem (latte)',
    calories: 60, protein: 3, carbs: 6, fat: 2.5, unit: '100g', portionG: 300,
    category: 'Napoje',
    description: 'Kawa latte (espresso + mleko spienione 2%). Składniki: espresso (30ml), mleko 2% (250ml).',
  },
  {
    name: 'Herbata z mlekiem i cukrem',
    calories: 30, protein: 1, carbs: 5, fat: 0.8, unit: '100g', portionG: 300,
    category: 'Napoje',
    description: 'Herbata czarna z mlekiem i łyżeczką cukru. Składniki: herbata, woda, mleko (30ml), cukier (5g).',
  },
  {
    name: 'Koktajl bananowy',
    calories: 100, protein: 4, carbs: 18, fat: 1.5, unit: '100g', portionG: 350,
    category: 'Napoje',
    description: 'Smoothie bananowe z mlekiem. Składniki: banan (150g), mleko 2% (200ml), opcjonalnie: miód, kakao.',
  },
  {
    name: 'Sok pomarańczowy świeży',
    calories: 45, protein: 0.7, carbs: 10, fat: 0.2, unit: '100g', portionG: 250,
    category: 'Napoje',
    description: 'Sok wyciśnięty ze świeżych pomarańczy. Składniki: pomarańcze (3 szt. = ~250ml soku).',
  },
];

export const DISH_CATEGORIES = [...new Set(POLISH_DISHES.map((d) => d.category))];

INSERT INTO store_settings(id,name,whatsapp,pickup_address) VALUES(true,'A Moça da Pipoca','','Endereço demonstrativo · configure a retirada no painel') ON CONFLICT DO NOTHING;
INSERT INTO products(id,name,description,category,image,unit,price_cents,min_qty,max_qty,options) VALUES
('20000000-0000-4000-8000-000000000001','Pipoca gourmet','Crocante, delicada e feita com muito carinho. Escolha seus sabores favoritos.','Pipocas gourmet','/products/pipoca-caramelo.svg','pacote de 100 g',1800,1,30,'{"flavors":["Caramelo flor de sal","Leite em pó","Chocolate belga"],"addons":[{"id":"laco","name":"Laço de cetim","priceCents":200},{"id":"tag","name":"Tag personalizada","priceCents":150}],"fields":[{"id":"mensagem","label":"Mensagem para a tag","type":"text","required":false}]}'),
('20000000-0000-4000-8000-000000000002','Cookies artesanais','Casquinha delicada, miolo macio e generosos pedacinhos de chocolate.','Doces artesanais','/products/cookies.svg','caixa com 6 unidades',4200,1,12,'{"flavors":["Chocolate ao leite","Chocolate branco"],"addons":[{"id":"presente","name":"Embalagem presenteável","priceCents":500}],"fields":[]}'),
('20000000-0000-4000-8000-000000000003','Caixa de carinho','Um presente doce: uma seleção especial de pipocas gourmet para encantar.','Presentes','/products/kit-presente.svg','kit com 3 potes',6800,1,10,'{"flavors":["Seleção da Moça","Só chocolate"],"addons":[{"id":"cartao","name":"Cartão escrito à mão","priceCents":400}],"fields":[{"id":"para","label":"Para quem é o presente?","type":"text","required":false}]}')
ON CONFLICT(id) DO NOTHING;
INSERT INTO business_dates(date,is_open,note)
SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date + n, (n%7 NOT IN (0)), '' FROM generate_series(15,74) n ON CONFLICT DO NOTHING;
INSERT INTO date_offers(date,product_id,capacity)
SELECT d.date,p.id, CASE WHEN p.category='Presentes' THEN 10 ELSE 30 END FROM business_dates d CROSS JOIN products p ON CONFLICT DO NOTHING;
INSERT INTO pickup_slots(date,label,capacity)
SELECT d.date,s.label,12 FROM business_dates d CROSS JOIN (VALUES('10:00 às 12:00'),('14:00 às 17:00')) s(label) ON CONFLICT DO NOTHING;

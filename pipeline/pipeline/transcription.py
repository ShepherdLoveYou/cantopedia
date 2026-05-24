"""Hand-transcription of the source menu sheets.

Each entry preserves what is on the original 茶餐廳 water-board exactly,
plus minimal tri-lingual metadata so the `init` command can emit valid
stub YAML for every dish.

The transcription is the project's single most precious primary source:
edit with care and always preserve `menu_no` ↔ `yue_hant` integrity.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ---------- ingredient master registry ----------
# Each entry: id, names (yue_hant, jyutping, zh, en), category.
# Stub YAMLs will be emitted for these by `pipeline init`. Detailed nutrition
# / procurement notes can be filled in later or fetched by the `fetch` command.

INGREDIENT_REGISTRY: list[dict] = [
    # already in data/ingredients/ — kept here for reference, not regenerated
    # ("cha-siu", "叉燒", "caa1 siu1", "叉烧", "Char siu (Cantonese BBQ pork)", "meat"),
    # ("gai-laan", "芥蘭", "gaai3 laan2", "芥兰", "Chinese broccoli (gai lan)", "vegetable"),
    # ("jasmine-rice", "絲苗白飯", "si1 miu4 baak6 faan6", "丝苗白饭", "Jasmine rice (cooked)", "grain"),
    # ("honey", "蜂蜜", "fung1 mat6", "蜂蜜", "Honey", "other"),
    # ("hoisin-sauce", "海鮮醬", "hoi2 sin1 zoeng3", "海鲜酱", "Hoisin sauce", "sauce"),
    # ("maltose", "麥芽糖", "mak6 ngaa4 tong4", "麦芽糖", "Maltose", "other"),

    # Proteins
    {"id": "chicken-slices",   "yue_hant": "雞片",   "jyutping": "gai1 pin2",     "zh": "鸡片",     "en": "Sliced chicken",                  "cat": "meat"},
    {"id": "chicken-balls",    "yue_hant": "雞球",   "jyutping": "gai1 kau4",     "zh": "鸡球",     "en": "Chicken balls",                   "cat": "meat"},
    {"id": "chicken-strips",   "yue_hant": "雞絲",   "jyutping": "gai1 si1",      "zh": "鸡丝",     "en": "Shredded chicken",                "cat": "meat"},
    {"id": "chicken-chop",     "yue_hant": "雞扒",   "jyutping": "gai1 paa2",     "zh": "鸡扒",     "en": "Chicken chop (boneless thigh)",   "cat": "meat"},
    {"id": "chicken-wing",     "yue_hant": "雞翼",   "jyutping": "gai1 jik6",     "zh": "鸡翼",     "en": "Chicken wing",                    "cat": "meat"},
    {"id": "hainanese-chicken","yue_hant": "海南雞", "jyutping": "hoi2 naam4 gai1","zh": "海南鸡",   "en": "Hainanese poached chicken",       "cat": "meat"},
    {"id": "shrimp-balls",     "yue_hant": "蝦球",   "jyutping": "haa1 kau4",     "zh": "虾球",     "en": "Shrimp balls",                    "cat": "seafood"},
    {"id": "shrimp-meat",      "yue_hant": "蝦仁",   "jyutping": "haa1 jan4",     "zh": "虾仁",     "en": "Peeled shrimp",                   "cat": "seafood"},
    {"id": "large-shrimp",     "yue_hant": "大蝦",   "jyutping": "daai6 haa1",    "zh": "大虾",     "en": "Large prawn",                     "cat": "seafood"},
    {"id": "shrimp-fritter",   "yue_hant": "炸蝦角", "jyutping": "zaa3 haa1 gok3", "zh": "炸虾角",   "en": "Fried shrimp dumpling",           "cat": "seafood"},
    {"id": "fish-fillet",      "yue_hant": "魚柳",   "jyutping": "jyu4 lau5",     "zh": "鱼柳",     "en": "Fish fillet",                     "cat": "seafood"},
    {"id": "fish-balls",       "yue_hant": "魚球",   "jyutping": "jyu4 kau4",     "zh": "鱼球",     "en": "Fish balls",                      "cat": "seafood"},
    {"id": "fish-cake-balls",  "yue_hant": "魚蛋",   "jyutping": "jyu4 daan2",    "zh": "鱼蛋",     "en": "Hong Kong fish cake balls",       "cat": "seafood"},
    {"id": "sole-fillet",      "yue_hant": "龍利柳", "jyutping": "lung4 lei6 lau5","zh": "龙利柳",   "en": "Sole fillet (dover-style)",       "cat": "seafood"},
    {"id": "sole-balls",       "yue_hant": "龍利球", "jyutping": "lung4 lei6 kau4","zh": "龙利球",   "en": "Sole balls",                      "cat": "seafood"},
    {"id": "squid",            "yue_hant": "鮮尤",   "jyutping": "sin1 jau4",     "zh": "鲜鱿",     "en": "Fresh squid",                     "cat": "seafood"},
    {"id": "crab-stick",       "yue_hant": "蟹柳",   "jyutping": "haai5 lau5",    "zh": "蟹柳",     "en": "Imitation crab stick",            "cat": "seafood"},
    {"id": "mussel",           "yue_hant": "青口",   "jyutping": "ceng1 hau2",    "zh": "青口",     "en": "Green-lipped mussel",             "cat": "seafood"},
    {"id": "seafood-mix",      "yue_hant": "海鮮粒", "jyutping": "hoi2 sin1 lap1", "zh": "海鲜粒",   "en": "Mixed seafood (diced)",           "cat": "seafood"},
    {"id": "fish-roe",         "yue_hant": "魚籽",   "jyutping": "jyu4 zi2",      "zh": "鱼籽",     "en": "Fish roe",                        "cat": "seafood"},
    {"id": "dried-scallop",    "yue_hant": "瑤柱",   "jyutping": "jiu4 cyu5",     "zh": "瑶柱",     "en": "Dried scallop (conpoy)",          "cat": "seafood"},
    {"id": "beef-slices",      "yue_hant": "牛片",   "jyutping": "ngau4 pin2",    "zh": "牛片",     "en": "Sliced beef",                     "cat": "meat"},
    {"id": "beef-strips",      "yue_hant": "牛絲",   "jyutping": "ngau4 si1",     "zh": "牛丝",     "en": "Shredded beef",                   "cat": "meat"},
    {"id": "beef-brisket",     "yue_hant": "牛腩",   "jyutping": "ngau4 naam5",   "zh": "牛腩",     "en": "Beef brisket",                    "cat": "meat"},
    {"id": "pork-chop",        "yue_hant": "豬扒",   "jyutping": "zyu1 paa2",     "zh": "猪扒",     "en": "Pork chop",                       "cat": "meat"},
    {"id": "pork-strips",      "yue_hant": "肉絲",   "jyutping": "juk6 si1",      "zh": "肉丝",     "en": "Shredded pork",                   "cat": "meat"},
    {"id": "spare-ribs-dry",   "yue_hant": "乾骨",   "jyutping": "gon1 gwat1",    "zh": "干骨",     "en": "Dry-roasted spare ribs",          "cat": "meat"},
    {"id": "kyoto-ribs",       "yue_hant": "京都骨", "jyutping": "ging1 dou1 gwat1","zh": "京都骨", "en": "Kyoto-style fried pork ribs",     "cat": "meat"},
    {"id": "sweet-sour-pork",  "yue_hant": "咕嚕肉", "jyutping": "gu1 lou1 juk6", "zh": "咕咾肉",   "en": "Sweet-and-sour pork",             "cat": "meat"},
    {"id": "ham-strips",       "yue_hant": "火腿絲", "jyutping": "fo2 teoi2 si1", "zh": "火腿丝",   "en": "Ham strips",                      "cat": "meat"},
    {"id": "wontons",          "yue_hant": "雲吞",   "jyutping": "wan4 tan1",     "zh": "云吞",     "en": "Wontons",                         "cat": "other"},
    {"id": "spring-rolls-veg", "yue_hant": "脆皮齋春捲", "jyutping": "ceoi3 pei4 zaai1 ceon1 gyun2", "zh": "脆皮斋春卷", "en": "Crispy vegetable spring rolls", "cat": "other"},
    {"id": "potstickers",      "yue_hant": "京式煎鍋貼", "jyutping": "ging1 sik1 zin1 wo1 tip3", "zh": "京式煎锅贴", "en": "Beijing pan-fried dumplings (guotie)", "cat": "other"},
    {"id": "sichuan-wonton",   "yue_hant": "抄手",   "jyutping": "caau1 sau2",    "zh": "抄手",     "en": "Sichuan wonton",                  "cat": "other"},
    {"id": "century-egg",      "yue_hant": "皮蛋",   "jyutping": "pei4 daan2",    "zh": "皮蛋",     "en": "Century egg",                     "cat": "egg"},
    {"id": "egg",              "yue_hant": "蛋",     "jyutping": "daan2",         "zh": "蛋",       "en": "Egg",                             "cat": "egg"},
    {"id": "youtiao",          "yue_hant": "油條",   "jyutping": "jau4 tiu4",     "zh": "油条",     "en": "Chinese fried cruller (youtiao)", "cat": "other"},

    # Vegetables
    {"id": "broccoli",         "yue_hant": "西蘭花", "jyutping": "sai1 laan4 faa1","zh": "西兰花",   "en": "Broccoli",                        "cat": "vegetable"},
    {"id": "cauliflower",      "yue_hant": "椰菜花", "jyutping": "je4 coi3 faa1", "zh": "椰菜花",   "en": "Cauliflower",                     "cat": "vegetable"},
    {"id": "mushroom",         "yue_hant": "蘑菇",   "jyutping": "mo4 gu1",       "zh": "蘑菇",     "en": "Button mushroom",                 "cat": "vegetable"},
    {"id": "shiitake-dry",     "yue_hant": "冬菇",   "jyutping": "dung1 gu1",     "zh": "冬菇",     "en": "Dried shiitake",                  "cat": "vegetable"},
    {"id": "carrot",           "yue_hant": "紅蘿蔔", "jyutping": "hung4 lo4 baak6","zh": "红萝卜",   "en": "Carrot",                          "cat": "vegetable"},
    {"id": "corn",             "yue_hant": "粟米",   "jyutping": "suk1 mai5",     "zh": "粟米",     "en": "Sweet corn",                      "cat": "vegetable"},
    {"id": "green-peas",       "yue_hant": "青豆",   "jyutping": "ceng1 dau2",    "zh": "青豆",     "en": "Green peas",                      "cat": "vegetable"},
    {"id": "scallion",         "yue_hant": "蔥",     "jyutping": "cung1",         "zh": "葱",       "en": "Scallion",                        "cat": "vegetable"},
    {"id": "garlic",           "yue_hant": "蒜茸",   "jyutping": "syun3 jung4",   "zh": "蒜茸",     "en": "Minced garlic",                   "cat": "spice"},
    {"id": "onion",            "yue_hant": "洋蔥",   "jyutping": "joeng4 cung1",  "zh": "洋葱",     "en": "Onion",                           "cat": "vegetable"},
    {"id": "bell-pepper",      "yue_hant": "青紅椒", "jyutping": "ceng1 hung4 ziu1","zh": "青红椒", "en": "Green and red bell pepper",       "cat": "vegetable"},
    {"id": "tomato",           "yue_hant": "番茄",   "jyutping": "faan1 ke2",     "zh": "番茄",     "en": "Tomato",                          "cat": "vegetable"},
    {"id": "celery",           "yue_hant": "西芹",   "jyutping": "sai1 kan4",     "zh": "西芹",     "en": "Celery",                          "cat": "vegetable"},
    {"id": "long-bean",        "yue_hant": "豆仔",   "jyutping": "dau6 zai2",     "zh": "豆仔",     "en": "Yard-long bean",                  "cat": "vegetable"},
    {"id": "snow-vegetable",   "yue_hant": "雪菜",   "jyutping": "syut3 coi3",    "zh": "雪菜",     "en": "Snow vegetable (pickled mustard)","cat": "vegetable"},
    {"id": "potato",           "yue_hant": "薯仔",   "jyutping": "syu4 zai2",     "zh": "薯仔",     "en": "Potato",                          "cat": "vegetable"},
    {"id": "bean-sprouts",     "yue_hant": "芽菜",   "jyutping": "ngaa4 coi3",    "zh": "芽菜",     "en": "Mung bean sprouts",               "cat": "vegetable"},
    {"id": "lettuce",          "yue_hant": "生菜",   "jyutping": "saang1 coi3",   "zh": "生菜",     "en": "Lettuce",                         "cat": "vegetable"},
    {"id": "turnip",           "yue_hant": "豆卜",   "jyutping": "dau6 buk1",     "zh": "豆卜",     "en": "Tofu puff (or daikon)",           "cat": "vegetable"},
    {"id": "cilantro",         "yue_hant": "芫茜",   "jyutping": "jyun4 sai1",    "zh": "芫荽",     "en": "Cilantro",                        "cat": "vegetable"},
    {"id": "lemon",            "yue_hant": "檸檬",   "jyutping": "ning4 mung1",   "zh": "柠檬",     "en": "Lemon",                           "cat": "fruit"},
    {"id": "pineapple",        "yue_hant": "菠蘿",   "jyutping": "bo1 lo4",       "zh": "菠萝",     "en": "Pineapple",                       "cat": "fruit"},
    {"id": "ginger",           "yue_hant": "薑",     "jyutping": "goeng1",        "zh": "姜",       "en": "Ginger",                          "cat": "spice"},
    {"id": "dry-fried-onion",  "yue_hant": "炸幹蔥", "jyutping": "zaa3 gon1 cung1","zh": "炸干葱",   "en": "Fried shallot",                   "cat": "vegetable"},
    {"id": "preserved-tofu",   "yue_hant": "豉",     "jyutping": "si6",           "zh": "豆豉",     "en": "Fermented black beans (douchi)",  "cat": "other"},
    {"id": "peanuts",          "yue_hant": "花生",   "jyutping": "faa1 sang1",    "zh": "花生",     "en": "Peanuts",                         "cat": "other"},

    # Carbs (noodles/rice/grains)
    {"id": "rice-vermicelli",  "yue_hant": "米粉",   "jyutping": "mai5 fan2",     "zh": "米粉",     "en": "Rice vermicelli",                 "cat": "noodle"},
    {"id": "rice-noodle",      "yue_hant": "米線",   "jyutping": "mai5 sin3",     "zh": "米线",     "en": "Round rice noodle",               "cat": "noodle"},
    {"id": "hor-fun",          "yue_hant": "河粉",   "jyutping": "ho2 fan2",      "zh": "河粉",     "en": "Hor fun (flat rice noodle)",      "cat": "noodle"},
    {"id": "pan-fried-noodle", "yue_hant": "煎麵",   "jyutping": "zin1 min6",     "zh": "煎面",     "en": "Pan-fried egg noodle nest",       "cat": "noodle"},
    {"id": "yi-noodle",        "yue_hant": "伊麵",   "jyutping": "ji1 min6",      "zh": "伊面",     "en": "E-fu (yi mein) noodles",          "cat": "noodle"},
    {"id": "spaghetti",        "yue_hant": "意粉",   "jyutping": "ji3 fan2",      "zh": "意粉",     "en": "Spaghetti",                       "cat": "noodle"},
    {"id": "white-rice",       "yue_hant": "白飯",   "jyutping": "baak6 faan6",   "zh": "白饭",     "en": "Cooked white rice",               "cat": "grain"},
    {"id": "chicken-oil-rice", "yue_hant": "雞油飯", "jyutping": "gai1 jau4 faan6","zh": "鸡油饭",   "en": "Chicken-fat rice",                "cat": "grain"},
    {"id": "fried-rice-base",  "yue_hant": "炒飯底", "jyutping": "caau2 faan6 dai2","zh": "炒饭底", "en": "Fried-rice base",                  "cat": "grain"},
    {"id": "congee-base",      "yue_hant": "粥底",   "jyutping": "zuk1 dai2",     "zh": "粥底",     "en": "Plain congee base",               "cat": "grain"},

    # Sauces, seasonings, condiments
    {"id": "plum-sauce",       "yue_hant": "酸梅醬", "jyutping": "syun1 mui4 zoeng3","zh": "酸梅酱","en": "Plum sauce",                       "cat": "sauce"},
    {"id": "zhejiang-vinegar", "yue_hant": "浙醋",   "jyutping": "zit3 cou3",     "zh": "浙醋",     "en": "Zhejiang red vinegar",            "cat": "sauce"},
    {"id": "salad-mayo",       "yue_hant": "沙律醬", "jyutping": "saa1 leot6 zoeng3","zh": "沙律酱","en": "Salad (mayo-based) sauce",         "cat": "sauce"},
    {"id": "huai-salt",        "yue_hant": "淮鹽",   "jyutping": "waai4 jim4",    "zh": "淮盐",     "en": "Huai salt (five-spice salt)",     "cat": "spice"},
    {"id": "chili-oil",        "yue_hant": "紅油",   "jyutping": "hung4 jau4",    "zh": "红油",     "en": "Sichuan chili oil",               "cat": "sauce"},
    {"id": "wonton-broth",     "yue_hant": "抄手汁", "jyutping": "caau1 sau2 zap1","zh": "抄手汁",  "en": "Sichuan wonton dressing",         "cat": "sauce"},
    {"id": "sesame",           "yue_hant": "芝麻",   "jyutping": "zi1 maa4",      "zh": "芝麻",     "en": "Sesame seed",                     "cat": "spice"},
    {"id": "salt-pepper-mix",  "yue_hant": "椒鹽料", "jyutping": "ziu1 jim4 liu2","zh": "椒盐料",   "en": "Salt-and-pepper seasoning mix",    "cat": "spice"},
    {"id": "sweet-chicken-sauce","yue_hant": "甜雞醬","jyutping": "tim4 gai1 zoeng3","zh": "甜鸡酱","en": "Sweet chicken sauce",              "cat": "sauce"},
    {"id": "honey-garlic-sauce","yue_hant": "蜜蒜汁","jyutping": "mat6 syun3 zap1","zh": "蜜蒜汁",  "en": "Honey-garlic glaze",              "cat": "sauce"},
    {"id": "coconut-milk",     "yue_hant": "椰汁",   "jyutping": "je4 zap1",      "zh": "椰汁",     "en": "Coconut milk",                    "cat": "other"},
    {"id": "laksa-paste",      "yue_hant": "喇沙醬", "jyutping": "laat6 saa1 zoeng3","zh": "喇沙酱","en": "Laksa paste",                     "cat": "sauce"},
    {"id": "curry-powder",     "yue_hant": "咖喱粉", "jyutping": "gaa3 lei1 fan2","zh": "咖喱粉",   "en": "Curry powder",                    "cat": "spice"},
    {"id": "curry-paste",      "yue_hant": "咖喱",   "jyutping": "gaa3 lei1",     "zh": "咖喱",     "en": "Curry paste",                     "cat": "sauce"},
    {"id": "satay-sauce",      "yue_hant": "沙爹醬", "jyutping": "saa1 de1 zoeng3","zh": "沙爹酱",  "en": "Satay sauce",                     "cat": "sauce"},
    {"id": "oyster-sauce",     "yue_hant": "蠔油",   "jyutping": "hou4 jau4",     "zh": "蚝油",     "en": "Oyster sauce",                    "cat": "sauce"},
    {"id": "black-bean-sauce", "yue_hant": "豉汁",   "jyutping": "si6 zap1",      "zh": "豉汁",     "en": "Fermented black bean sauce",       "cat": "sauce"},
    {"id": "chu-hou-sauce",    "yue_hant": "柱侯醬", "jyutping": "cyu5 hau4 zoeng3","zh": "柱侯酱", "en": "Chu Hou sauce",                   "cat": "sauce"},
    {"id": "tomato-sauce",     "yue_hant": "茄汁",   "jyutping": "ke2 zap1",      "zh": "茄汁",     "en": "Cantonese tomato sauce",          "cat": "sauce"},
    {"id": "cheese",           "yue_hant": "芝士",   "jyutping": "zi1 si6",       "zh": "芝士",     "en": "Cheese (mozzarella/blend)",       "cat": "dairy"},
    {"id": "portuguese-sauce", "yue_hant": "葡汁",   "jyutping": "pou4 zap1",     "zh": "葡汁",     "en": "Portuguese sauce (curry-coconut)","cat": "sauce"},
    {"id": "bechamel-white",   "yue_hant": "白汁",   "jyutping": "baak6 zap1",    "zh": "白汁",     "en": "White (béchamel) sauce",          "cat": "sauce"},
    {"id": "herbs",            "yue_hant": "香草",   "jyutping": "hoeng1 cou2",   "zh": "香草",     "en": "Italian herbs",                   "cat": "spice"},
    {"id": "black-pepper",     "yue_hant": "黑椒粉", "jyutping": "hak1 ziu1 fan2","zh": "黑椒粉",   "en": "Ground black pepper",             "cat": "spice"},
    {"id": "kyoto-sauce",      "yue_hant": "京都汁", "jyutping": "ging1 dou1 zap1","zh": "京都汁",  "en": "Kyoto sauce (sweet pork glaze)",  "cat": "sauce"},
    {"id": "sweet-sour-sauce", "yue_hant": "糖醋",   "jyutping": "tong4 cou3",    "zh": "糖醋",     "en": "Sweet-and-sour sauce",            "cat": "sauce"},
    {"id": "oil-poach-mix",    "yue_hant": "油泡料", "jyutping": "jau4 paau5 liu2","zh": "油泡料",  "en": "Oil-blanching seasoning mix",      "cat": "spice"},
    {"id": "red-yeast-rice",   "yue_hant": "紅麴米粉","jyutping": "hung4 kuk1 mai5 fan2","zh": "红麴米粉","en": "Red yeast rice powder",     "cat": "spice"},
    {"id": "ginger-scallion",  "yue_hant": "薑蔥料", "jyutping": "goeng1 cung1 liu2","zh": "姜葱料","en": "Ginger-scallion mixture",          "cat": "spice"},
    {"id": "chicken-jus",      "yue_hant": "雞醬",   "jyutping": "gai1 zoeng3",   "zh": "鸡酱",     "en": "Chicken jus",                     "cat": "sauce"},
    {"id": "ginger-dip",       "yue_hant": "薑蓉",   "jyutping": "goeng1 jung4",  "zh": "姜蓉",     "en": "Ginger paste dip",                "cat": "spice"},
    {"id": "sesame-noodle",    "yue_hant": "芝麻面", "jyutping": "zi1 maa4 min6", "zh": "芝麻面",   "en": "Sesame topping",                  "cat": "spice"},
    {"id": "cheese-topping",   "yue_hant": "芝士面", "jyutping": "zi1 si6 min6",  "zh": "芝士面",   "en": "Cheese topping",                  "cat": "dairy"},
    {"id": "chili-paste",      "yue_hant": "辣椒醬", "jyutping": "laat6 ziu1 zoeng3","zh": "辣椒酱","en": "Chili paste",                     "cat": "sauce"},
    {"id": "shrimp-roe-noodle","yue_hant": "炸瑤柱面","jyutping": "zaa3 jiu4 cyu5 min6","zh": "炸瑶柱面","en": "Fried dried-scallop topping","cat": "seafood"},
    {"id": "honey-glaze-ing",  "yue_hant": "蜜汁",   "jyutping": "mat6 zap1",     "zh": "蜜汁",     "en": "Honey glaze",                     "cat": "sauce"},
    {"id": "garlic-glaze",     "yue_hant": "蒜汁",   "jyutping": "syun3 zap1",    "zh": "蒜汁",     "en": "Garlic glaze",                    "cat": "sauce"},
]


@dataclass
class DishTranscription:
    """One row of the source menu."""
    no: int                       # menu_no (1..66)
    yue_hant: str
    jyutping: str
    zh: str
    en: str
    category: str                 # one of: appetizer, soup-wonton, rice, noodle, soup-noodle, baked-rice, congee, main
    # Each ingredient: (ingredient_id_in_registry, qty, unit, optional_prep_note)
    ingredients: list[tuple[str, float, str]] = field(default_factory=list)
    sauce: str | None = None      # id from data/sauces/
    variants: list[str] | None = None
    notes: str | None = None      # free-text human note preserved verbatim from menu


# ---------- the 66 dishes ----------

DISHES: list[DishTranscription] = [
    # 頭盤 / 小食 (appetizer) — items 1-7
    DishTranscription(1,  "脆皮齋春捲", "ceoi3 pei4 zaai1 ceon1 gyun2", "脆皮斋春卷", "Crispy Vegetable Spring Rolls", "appetizer",
        [("spring-rolls-veg", 3, "條")], notes="伴酸梅醬"),
    DishTranscription(2,  "京式煎鍋貼", "ging1 sik1 zin1 wo1 tip3", "京式煎锅贴", "Beijing Pan-fried Dumplings (Guotie)", "appetizer",
        [("potstickers", 8, "件")], notes="伴浙醋"),
    DishTranscription(3,  "沙律炸蝦角", "saa1 leot6 zaa3 haa1 gok3", "沙律炸虾角", "Salad-mayo Fried Shrimp Parcels", "appetizer",
        [("shrimp-fritter", 6, "件")], notes="伴沙律醬"),
    DishTranscription(4,  "椒鹽炸魚蛋", "ziu1 jim4 zaa3 jyu4 daan2", "椒盐炸鱼蛋", "Salt-and-pepper Fried Fish Balls", "appetizer",
        [("fish-cake-balls", 12, "件"), ("salt-pepper-mix", 1, "份")]),
    DishTranscription(5,  "蒜香焗乾骨", "syun3 hoeng1 guk6 gon1 gwat1", "蒜香焗干骨", "Garlic-baked Dry Spare Ribs", "appetizer",
        [("spare-ribs-dry", 1, "磅"), ("garlic", 1, "份"), ("huai-salt", 1, "份")]),
    DishTranscription(6,  "四川紅油抄手", "sei3 cyun1 hung4 jau4 caau1 sau2", "四川红油抄手", "Sichuan Chili-oil Wontons", "appetizer",
        [("sichuan-wonton", 8, "件"), ("wonton-broth", 1, "份"), ("chili-oil", 1, "份"), ("sesame", 1, "份"), ("scallion", 1, "份")]),
    DishTranscription(7,  "酥炸雞翼", "sou1 zaa3 gai1 jik6", "酥炸鸡翼", "Crispy Fried Chicken Wings", "appetizer",
        [("chicken-wing", 8, "件"), ("salt-pepper-mix", 1, "份"), ("sweet-chicken-sauce", 1, "份"), ("honey-garlic-sauce", 1, "份"), ("lettuce", 1, "份"), ("sesame", 1, "份")]),

    # 湯 / 雲吞 (soup-wonton) — items 8-10
    DishTranscription(8,  "窩雲吞", "wo1 wan4 tan1", "窝云吞", "Wonton Pot (with Mixed Toppings)", "soup-wonton",
        [("wontons", 6, "粒"), ("large-shrimp", 2, "件"), ("chicken-slices", 3, "件"), ("cha-siu", 3, "件"),
         ("broccoli", 3, "件"), ("cauliflower", 3, "件"), ("mushroom", 3, "件"), ("carrot", 3, "件"), ("corn", 3, "件")]),
    DishTranscription(9,  "雲吞湯", "wan4 tan1 tong1", "云吞汤", "Wonton Soup", "soup-wonton",
        [("wontons", 6, "粒"), ("broccoli", 3, "件"), ("cauliflower", 3, "件"), ("mushroom", 3, "件"), ("carrot", 3, "件"), ("corn", 3, "件")]),
    DishTranscription(10, "例湯", "lai6 tong1", "例汤", "Soup of the Day", "soup-wonton",
        [("white-rice", 1, "碗")], notes="湯底每日變換"),

    # 炒飯 (rice) — items 11-21
    DishTranscription(11, "大富豪炒飯", "daai6 fu3 hou4 caau2 faan6", "大富豪炒饭", "Dafuhao Deluxe Fried Rice", "rice",
        [("shrimp-balls", 5, "件"), ("seafood-mix", 1.5, "兩"), ("fried-rice-base", 2, "份"), ("fish-roe", 1, "份"),
         ("scallion", 1, "份"), ("shrimp-roe-noodle", 1, "份")]),
    DishTranscription(12, "揚州炒飯", "joeng4 zau1 caau2 faan6", "扬州炒饭", "Yangzhou Fried Rice", "rice",
        [("shrimp-meat", 1, "份"), ("cha-siu", 1, "份"), ("chicken-balls", 1, "份"), ("green-peas", 1, "份"),
         ("scallion", 1, "份"), ("fried-rice-base", 2, "份")], notes="材料合共三兩"),
    DishTranscription(13, "雞粒炒飯", "gai1 lap1 caau2 faan6", "鸡粒炒饭", "Diced Chicken Fried Rice", "rice",
        [("chicken-balls", 2, "兩"), ("green-peas", 1, "份"), ("scallion", 1, "份"), ("fried-rice-base", 2, "份")]),
    DishTranscription(14, "蝦仁炒飯", "haa1 jan4 caau2 faan6", "虾仁炒饭", "Shrimp Fried Rice", "rice",
        [("shrimp-meat", 2, "兩"), ("green-peas", 1, "份"), ("scallion", 1, "份"), ("fried-rice-base", 2, "份")]),
    DishTranscription(15, "福建炒飯", "fuk1 gin3 caau2 faan6", "福建炒饭", "Fujian Fried Rice (gravy-topped)", "rice",
        [("fried-rice-base", 2, "份"), ("shrimp-meat", 1, "份"), ("seafood-mix", 1, "份"), ("chicken-balls", 1, "份"),
         ("green-peas", 1, "份"), ("carrot", 1, "份"), ("mushroom", 1, "份"), ("oyster-sauce", 1, "份"), ("shrimp-roe-noodle", 1, "份")],
        notes="材料合共三兩"),
    DishTranscription(16, "蜜汁叉燒飯", "mat6 zap1 caa1 siu1 faan6", "蜜汁叉烧饭", "BBQ Pork Rice with Honey Glaze", "rice",
        [("cha-siu", 12, "件"), ("gai-laan", 6, "件"), ("jasmine-rice", 1, "碗")],
        sauce="honey-glaze"),
    DishTranscription(17, "粟米魚柳飯", "suk1 mai5 jyu4 lau5 faan6", "粟米鱼柳饭", "Sweet-corn Fish Fillet Rice", "rice",
        [("fish-fillet", 8, "件"), ("corn", 0.5, "份"), ("egg", 1, "個"), ("white-rice", 1, "碗")],
        notes="餐汁 6 兩"),
    DishTranscription(18, "番茄洋蔥豬扒飯", "faan1 ke2 joeng4 cung1 zyu1 paa2 faan6", "番茄洋葱猪扒饭", "Tomato Onion Pork Chop Rice", "rice",
        [("tomato", 1.5, "個"), ("onion", 1, "份"), ("pork-chop", 2, "件"), ("white-rice", 1, "碗"), ("sweet-sour-sauce", 1, "份")],
        variants=["018b-faan1-ke2-joeng4-cung1-gai1-paa2-faan6"], notes="另有雞扒版"),
    DishTranscription(19, "咖喱薯仔牛腩飯", "gaa3 lei1 syu4 zai2 ngau4 naam5 faan6", "咖喱薯仔牛腩饭", "Curry Potato Beef Brisket Rice", "rice",
        [("beef-brisket", 1, "份"), ("potato", 1, "份"), ("curry-paste", 1, "份"), ("white-rice", 1, "碗")],
        notes="微波 2-3 分鐘打熱"),
    DishTranscription(20, "豆仔牛腩飯", "dau6 zai2 ngau4 naam5 faan6", "豆仔牛腩饭", "Yard-long Bean Beef Brisket Rice", "rice",
        [("beef-brisket", 9, "件"), ("long-bean", 3, "兩"), ("onion", 1, "份"), ("white-rice", 1, "碗")]),
    DishTranscription(21, "絲苗白飯", "si1 miu4 baak6 faan6", "丝苗白饭", "Plain Jasmine Rice", "rice",
        [("jasmine-rice", 1, "碗")]),

    # 炒麵 / 炒米 / 炒河 (noodle) — items 22-29
    DishTranscription(22, "招牌炒麵", "ziu1 paai4 caau2 min6", "招牌炒面", "Signature Stir-fried Noodles", "noodle",
        [("chicken-slices", 3, "件"), ("cha-siu", 3, "件"), ("shrimp-balls", 2, "件"), ("squid", 2, "件"), ("crab-stick", 2, "件"),
         ("fish-cake-balls", 1, "件"), ("broccoli", 3, "件"), ("carrot", 3, "件"), ("corn", 3, "件"), ("pan-fried-noodle", 6, "兩")]),
    DishTranscription(23, "海鮮炒麵", "hoi2 sin1 caau2 min6", "海鲜炒面", "Seafood Stir-fried Noodles", "noodle",
        [("shrimp-balls", 3, "件"), ("squid", 3, "件"), ("mussel", 3, "件"), ("crab-stick", 3, "件"), ("fish-balls", 3, "件"),
         ("fish-cake-balls", 3, "件"), ("carrot", 3, "件"), ("broccoli", 3, "件"), ("corn", 3, "件"), ("pan-fried-noodle", 6, "兩")]),
    DishTranscription(24, "沙爹牛肉麵", "saa1 de1 ngau4 juk6 min6", "沙爹牛肉面", "Satay Beef Noodles", "noodle",
        [("bell-pepper", 4, "兩"), ("carrot", 1, "份"), ("onion", 1, "份"), ("beef-slices", 10, "件"),
         ("satay-sauce", 1, "份"), ("oyster-sauce", 1, "份"), ("pan-fried-noodle", 6, "兩")]),
    DishTranscription(25, "家鄉炒米", "gaa1 hoeng1 caau2 mai5", "家乡炒米", "Country-style Fried Rice Vermicelli", "noodle",
        [("bell-pepper", 4, "兩"), ("onion", 1, "份"), ("bean-sprouts", 1, "份"), ("turnip", 1, "份"),
         ("shrimp-meat", 1, "兩"), ("ham-strips", 1, "兩"), ("egg", 1, "個"), ("rice-vermicelli", 6, "兩")]),
    DishTranscription(26, "星洲炒米", "sing1 zau1 caau2 mai5", "星洲炒米", "Singapore Fried Rice Vermicelli", "noodle",
        [("bell-pepper", 4, "兩"), ("onion", 1, "份"), ("bean-sprouts", 1, "份"), ("shrimp-meat", 1, "兩"),
         ("cha-siu", 1, "兩"), ("egg", 1, "個"), ("curry-powder", 1, "份"), ("rice-vermicelli", 6, "兩")]),
    DishTranscription(27, "干炒牛河", "gon1 caau2 ngau4 ho2", "干炒牛河", "Dry-fried Beef Hor Fun", "noodle",
        [("onion", 1, "份"), ("bean-sprouts", 3, "兩"), ("beef-slices", 8, "件"), ("scallion", 1, "份"), ("hor-fun", 1, "磅")]),
    DishTranscription(28, "柱侯牛腩炒河", "cyu5 hau4 ngau4 naam5 caau2 ho2", "柱侯牛腩炒河", "Chu Hou Beef-brisket Hor Fun", "noodle",
        [("hor-fun", 1, "磅"), ("long-bean", 3, "兩"), ("beef-brisket", 9, "件"), ("onion", 1, "份"), ("chu-hou-sauce", 1, "份")]),
    DishTranscription(29, "豉椒雞片炒河", "si6 ziu1 gai1 pin2 caau2 ho2", "豉椒鸡片炒河", "Black-bean Chili Chicken Hor Fun", "noodle",
        [("bell-pepper", 3, "兩"), ("onion", 1, "份"), ("chicken-slices", 8, "件"), ("hor-fun", 1, "磅"), ("black-bean-sauce", 1, "份")]),

    # 湯米線 / 喇沙 (soup-noodle) — items 30-34
    DishTranscription(30, "海南雞喇沙湯米線", "hoi2 naam4 gai1 laat6 saa1 tong1 mai5 sin3", "海南鸡喇沙汤米线", "Hainanese-chicken Laksa Vermicelli Soup", "soup-noodle",
        [("hainanese-chicken", 6, "件"), ("turnip", 2, "個"), ("crab-stick", 2, "件"), ("fish-cake-balls", 0.5, "件"),
         ("bean-sprouts", 1, "兩"), ("mushroom", 3, "件"), ("egg", 0.5, "個"), ("scallion", 1, "份"),
         ("cilantro", 1, "份"), ("rice-noodle", 6, "兩"), ("laksa-paste", 2, "匙"), ("coconut-milk", 0.2, "份")]),
    DishTranscription(31, "蝦球喇沙湯米線", "haa1 kau4 laat6 saa1 tong1 mai5 sin3", "虾球喇沙汤米线", "Shrimp-ball Laksa Vermicelli Soup", "soup-noodle",
        [("shrimp-balls", 6, "件"), ("rice-noodle", 6, "兩"), ("laksa-paste", 2, "匙"), ("coconut-milk", 0.2, "份")]),
    DishTranscription(32, "叉燒喇沙米線", "caa1 siu1 laat6 saa1 mai5 sin3", "叉烧喇沙米线", "Char-siu Laksa Vermicelli", "soup-noodle",
        [("cha-siu", 8, "片"), ("rice-noodle", 6, "兩"), ("laksa-paste", 2, "匙"), ("coconut-milk", 0.2, "份")]),
    DishTranscription(33, "柱侯牛腩湯米線", "cyu5 hau4 ngau4 naam5 tong1 mai5 sin3", "柱侯牛腩汤米线", "Chu Hou Beef-brisket Vermicelli Soup", "soup-noodle",
        [("beef-brisket", 9, "件"), ("lettuce", 3, "兩"), ("rice-noodle", 6, "兩"), ("chu-hou-sauce", 1, "份")]),
    DishTranscription(34, "雪菜肉絲湯米線", "syut3 coi3 juk6 si1 tong1 mai5 sin3", "雪菜肉丝汤米线", "Pickled-mustard Pork Vermicelli Soup", "soup-noodle",
        [("snow-vegetable", 1, "份"), ("pork-strips", 1, "份"), ("bean-sprouts", 1, "份"), ("turnip", 1, "份"),
         ("egg", 0.5, "個"), ("shiitake-dry", 1, "份"), ("peanuts", 1, "份"), ("rice-noodle", 6, "兩")]),

    # 焗飯 / 意粉 (baked-rice) — items 35-39
    DishTranscription(35, "茄汁豬扒飯", "ke2 zap1 zyu1 paa2 faan6", "茄汁猪扒饭", "Tomato Sauce Pork Chop Baked Rice", "baked-rice",
        [("pork-chop", 2, "件"), ("tomato", 1, "份"), ("green-peas", 1, "份"), ("onion", 1, "份"),
         ("tomato-sauce", 3, "兩"), ("cheese-topping", 1, "份"), ("white-rice", 1, "碗")],
        notes="灑芝士焗 10 分鐘；另有意粉版"),
    DishTranscription(36, "意式香草焗海鮮", "ji3 sik1 hoeng1 cou2 guk6 hoi2 sin1", "意式香草焗海鲜", "Italian Herb Baked Seafood", "baked-rice",
        [("shrimp-balls", 3, "件"), ("squid", 3, "件"), ("fish-fillet", 2, "件"), ("crab-stick", 3, "件"),
         ("fish-cake-balls", 0.5, "件"), ("mussel", 2, "件"), ("onion", 1, "份"), ("green-peas", 1, "份"),
         ("mushroom", 1, "份"), ("bechamel-white", 1, "份"), ("herbs", 1, "份"), ("cheese-topping", 1, "份")]),
    DishTranscription(37, "白汁雞扒飯", "baak6 zap1 gai1 paa2 faan6", "白汁鸡扒饭", "Béchamel Chicken Chop Baked Rice", "baked-rice",
        [("chicken-chop", 2, "件"), ("bechamel-white", 1, "份"), ("mushroom", 1, "份"), ("onion", 1, "份"),
         ("green-peas", 1, "份"), ("cheese-topping", 1, "份"), ("herbs", 1, "份")]),
    DishTranscription(38, "葡汁焗龍利柳飯", "pou4 zap1 guk6 lung4 lei6 lau5 faan6", "葡汁焗龙利柳饭", "Portuguese-sauce Baked Sole Rice", "baked-rice",
        [("sole-balls", 8, "件"), ("bell-pepper", 1, "兩"), ("onion", 1, "兩"), ("mushroom", 1, "兩"),
         ("portuguese-sauce", 4, "兩"), ("cheese-topping", 1, "份")]),
    DishTranscription(39, "葡汁鴛鴦飯", "pou4 zap1 jyun1 joeng1 faan6", "葡汁鸳鸯饭", "Portuguese-sauce Twin Chop Rice", "baked-rice",
        [("pork-chop", 1, "件"), ("chicken-chop", 1, "件"), ("bell-pepper", 1, "份"), ("onion", 1, "份"),
         ("mushroom", 1, "份"), ("portuguese-sauce", 4, "兩"), ("cheese-topping", 1, "份")]),

    # 粥品 (congee) — items 40-44
    DishTranscription(40, "沙田雞粥", "saa1 tin4 gai1 zuk1", "沙田鸡粥", "Sha Tin Chicken Congee", "congee",
        [("hainanese-chicken", 6, "件"), ("shiitake-dry", 1, "份"), ("peanuts", 1, "份"), ("scallion", 1, "份"), ("ginger-scallion", 1, "份"), ("congee-base", 1, "碗")]),
    DishTranscription(41, "海皇粥", "hoi2 wong4 zuk1", "海皇粥", "Imperial Seafood Congee", "congee",
        [("shrimp-balls", 2, "件"), ("crab-stick", 2, "件"), ("fish-cake-balls", 2, "件"), ("squid", 2, "件"),
         ("fish-balls", 2, "件"), ("mussel", 2, "件"), ("ginger-scallion", 1, "份"), ("congee-base", 1, "碗")]),
    DishTranscription(42, "薑蔥魚球粥", "goeng1 cung1 jyu4 kau4 zuk1", "姜葱鱼球粥", "Ginger-scallion Fish-ball Congee", "congee",
        [("fish-fillet", 8, "件"), ("ginger-scallion", 1, "份"), ("congee-base", 1, "碗")]),
    DishTranscription(43, "皮蛋瘦肉粥", "pei4 daan2 sau3 juk6 zuk1", "皮蛋瘦肉粥", "Century-egg & Lean Pork Congee", "congee",
        [("pork-strips", 1, "兩"), ("century-egg", 1, "個"), ("ginger-scallion", 1, "份"), ("congee-base", 1, "碗")]),
    DishTranscription(44, "蝦球滑雞粥", "haa1 kau4 waat6 gai1 zuk1", "虾球滑鸡粥", "Shrimp & Velveted-chicken Congee", "congee",
        [("shrimp-balls", 4, "件"), ("chicken-balls", 4, "件"), ("shiitake-dry", 1, "份"), ("ginger-scallion", 1, "份"), ("congee-base", 1, "碗")]),

    # 主菜 (main) — items 45-66
    DishTranscription(45, "油條", "jau4 tiu4", "油条", "Fried Cruller (Youtiao)", "main",
        [("youtiao", 1, "條")]),
    DishTranscription(46, "海南雞飯", "hoi2 naam4 gai1 faan6", "海南鸡饭", "Hainanese Chicken Rice", "main",
        [("hainanese-chicken", 10, "件"), ("chicken-oil-rice", 1, "碗"), ("broccoli", 8, "件"),
         ("chicken-jus", 1, "份"), ("ginger-dip", 1, "份")], notes="湯例 1 碗，雞醬 1 碟"),
    DishTranscription(47, "豉汁牛", "si6 zap1 ngau4", "豉汁牛", "Beef in Black Bean Sauce", "main",
        [("beef-slices", 8, "件"), ("bell-pepper", 1, "份"), ("mushroom", 1, "份"), ("onion", 1, "份"),
         ("large-shrimp", 6, "件"), ("spring-rolls-veg", 1, "條"), ("white-rice", 1, "碗")],
        sauce=None, variants=["047b-si6-zap1-gai1", "047c-si6-zap1-haa1"],
        notes="另有雞、蝦兩個版本"),
    DishTranscription(48, "薑汁牛絲飯", "goeng1 zap1 ngau4 si1 faan6", "姜汁牛丝饭", "Ginger Sauce Shredded-beef Rice", "main",
        [("beef-strips", 5, "兩"), ("fried-rice-base", 1, "碗"), ("white-rice", 2, "兩"), ("spring-rolls-veg", 1, "條")],
        variants=["048b-goeng1-zap1-gai1-si1-faan6"]),
    DishTranscription(49, "咕嚕雞飯", "gu1 lou1 gai1 faan6", "咕咾鸡饭", "Sweet-and-sour Chicken Rice", "main",
        [("chicken-balls", 5, "兩"), ("fried-rice-base", 1, "碗"), ("sweet-sour-sauce", 1, "份"),
         ("spring-rolls-veg", 1, "條"), ("white-rice", 2, "兩")],
        variants=["049b-gu1-lou1-zyu1-faan6"]),
    DishTranscription(50, "蒜汁脆皮雞", "syun3 zap1 ceoi3 pei4 gai1", "蒜汁脆皮鸡", "Garlic Crispy-skin Chicken", "main",
        [("chicken-balls", 0.5, "件"), ("garlic-glaze", 1, "份"), ("dry-fried-onion", 1, "份"), ("lettuce", 1, "份")],
        notes="脆炸雞半隻"),
    DishTranscription(51, "豉汁豆仔雞片", "si6 zap1 dau6 zai2 gai1 pin2", "豉汁豆仔鸡片", "Black-bean Yard-long Bean Chicken", "main",
        [("chicken-slices", 4, "兩"), ("long-bean", 6, "兩"), ("onion", 1, "份"), ("bell-pepper", 1, "份"), ("black-bean-sauce", 1, "份")],
        variants=["051b-si6-zap1-dau6-zai2-ngau4-pin2"]),
    DishTranscription(52, "宮保雞", "gung1 bou2 gai1", "宫保鸡", "Kung Pao Chicken", "main",
        [("chicken-balls", 1, "磅"), ("bell-pepper", 6, "件"), ("chili-paste", 1, "份"), ("sweet-sour-sauce", 4, "兩")]),
    DishTranscription(53, "檸檬酥雞", "ning4 mung1 sou1 gai1", "柠檬酥鸡", "Crispy Lemon Chicken", "main",
        [("chicken-balls", 4, "件"), ("lemon", 1, "碗"), ("lemon", 2, "件"), ("lettuce", 1, "份")],
        notes="伴檸檬與檸花"),
    DishTranscription(54, "椒鹽蝦", "ziu1 jim4 haa1", "椒盐虾", "Salt-and-pepper Shrimp", "main",
        [("salt-pepper-mix", 1, "份"), ("large-shrimp", 12, "件")]),
    DishTranscription(55, "西蘭花蝦球", "sai1 laan4 faa1 haa1 kau4", "西兰花虾球", "Broccoli Shrimp Balls", "main",
        [("shrimp-balls", 12, "件"), ("broccoli", 6, "兩"), ("oil-poach-mix", 1, "份")]),
    DishTranscription(56, "豉椒蝦球", "si6 ziu1 haa1 kau4", "豉椒虾球", "Black-bean Chili Shrimp Balls", "main",
        [("shrimp-balls", 12, "件"), ("bell-pepper", 1, "份"), ("onion", 6, "兩"), ("preserved-tofu", 1, "份"), ("chili-paste", 1, "份")]),
    DishTranscription(57, "油泡龍利球", "jau4 paau5 lung4 lei6 kau4", "油泡龙利球", "Oil-blanched Sole Balls", "main",
        [("celery", 5, "兩"), ("sole-balls", 5, "兩"), ("onion", 1, "兩"), ("oil-poach-mix", 1, "份")]),
    DishTranscription(58, "椒鹽三鮮", "ziu1 jim4 saam1 sin1", "椒盐三鲜", "Salt-and-pepper Three-Fresh Trio", "main",
        [("shrimp-balls", 5, "件"), ("sole-balls", 5, "件"), ("squid", 5, "件"), ("salt-pepper-mix", 1, "份")]),
    DishTranscription(59, "椒鹽鮮尤", "ziu1 jim4 sin1 jau4", "椒盐鲜鱿", "Salt-and-pepper Squid", "main",
        [("squid", 6, "兩"), ("salt-pepper-mix", 1, "份")], notes="15 件"),
    DishTranscription(60, "豉椒炒牛肉", "si6 ziu1 caau2 ngau4 juk6", "豉椒炒牛肉", "Black-bean Chili Stir-fried Beef", "main",
        [("beef-slices", 4, "兩"), ("bell-pepper", 6, "兩"), ("preserved-tofu", 1, "份"), ("chili-paste", 1, "份")],
        variants=["060b-si6-ziu1-caau2-gai1-pin2"]),
    DishTranscription(61, "薑汁干牛絲", "goeng1 zap1 gon1 ngau4 si1", "姜汁干牛丝", "Ginger-juice Fried Beef Strips", "main",
        [("beef-strips", 1, "磅"), ("bell-pepper", 1, "份"), ("onion", 1, "份")],
        variants=["061b-goeng1-zap1-gon1-gai1-si1"]),
    DishTranscription(62, "芥蘭炒牛肉", "gaai3 laan2 caau2 ngau4 juk6", "芥兰炒牛肉", "Gai Lan Stir-fried Beef", "main",
        [("garlic", 1, "份"), ("gai-laan", 1, "磅"), ("oyster-sauce", 1, "份"), ("beef-slices", 4, "兩"), ("oil-poach-mix", 1, "份")],
        variants=["062b-gaai3-laan2-caau2-gai1-pin2"]),
    DishTranscription(63, "黑椒蘑菇蔥爆牛肉", "hak1 ziu1 mo4 gu1 cung1 baau3 ngau4 juk6", "黑椒蘑菇葱爆牛肉", "Black-pepper Mushroom Scallion Beef", "main",
        [("mushroom", 4, "兩"), ("onion", 4, "兩"), ("beef-slices", 4, "兩"), ("ginger", 1, "份"), ("black-pepper", 1, "茶匙")],
        variants=["063b-hak1-ziu1-mo4-gu1-cung1-baau3-gai1-pin2"]),
    DishTranscription(64, "京都肉排", "ging1 dou1 juk6 paai4", "京都肉排", "Kyoto Pork Ribs", "main",
        [("onion", 1, "份"), ("kyoto-ribs", 8, "件"), ("kyoto-sauce", 1, "份"), ("sesame", 1, "份")]),
    DishTranscription(65, "椒鹽肉排", "ziu1 jim4 juk6 paai4", "椒盐肉排", "Salt-and-pepper Pork Ribs", "main",
        [("salt-pepper-mix", 1, "份"), ("kyoto-ribs", 8, "件"), ("huai-salt", 1, "份"), ("chili-paste", 1, "份")]),
    DishTranscription(66, "菠蘿咕嚕肉", "bo1 lo4 gu1 lou1 juk6", "菠萝咕咾肉", "Sweet-and-sour Pork with Pineapple", "main",
        [("sweet-sour-pork", 1, "磅"), ("pineapple", 1, "兩"), ("sweet-sour-sauce", 4, "兩"), ("bell-pepper", 1, "份"), ("onion", 1, "份")]),
]


def assert_invariants() -> None:
    """Sanity checks the transcription module exports valid data."""
    seen_no = set()
    for d in DISHES:
        assert 1 <= d.no <= 66, f"dish {d.yue_hant}: menu_no {d.no} out of range"
        assert d.no not in seen_no, f"duplicate menu_no {d.no}"
        seen_no.add(d.no)
        assert d.category in {
            "appetizer", "soup-wonton", "rice", "noodle",
            "soup-noodle", "baked-rice", "congee", "main",
        }, f"dish {d.yue_hant}: unknown category {d.category}"
        assert d.ingredients, f"dish {d.yue_hant} (#{d.no}): no ingredients listed"
    assert len(seen_no) == 66, f"expected 66 dishes, found {len(seen_no)}"

    ingredient_ids = {i["id"] for i in INGREDIENT_REGISTRY}
    already_in_data = {"cha-siu", "gai-laan", "jasmine-rice", "honey", "hoisin-sauce", "maltose"}
    all_known = ingredient_ids | already_in_data
    for d in DISHES:
        for ing_id, _qty, _unit in [(i[0], i[1], i[2]) for i in d.ingredients]:
            assert ing_id in all_known, f"dish #{d.no} ({d.yue_hant}) refs unknown ingredient: {ing_id}"


if __name__ == "__main__":
    assert_invariants()
    print(f"transcription OK: {len(DISHES)} dishes, {len(INGREDIENT_REGISTRY)} new ingredients")

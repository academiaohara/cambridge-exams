import json
import os

BASE = "/home/runner/work/cambridge-exams/cambridge-exams/data/Course/B1"

# ── helpers ─────────────────────────────────────────────────────────────────
def load(n):
    with open(f"{BASE}/Review{n}.json") as f:
        return json.load(f)

def save(n, data):
    with open(f"{BASE}/Review{n}.json", "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Review{n}.json ✓  totalPoints={data['totalPoints']}  sections={len(data['sections'])}")

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 1  A(8)+B(8)+C(4)+D(10)+E(20)=50
# Block 1: present simple/continuous/stative, past simple/continuous/used to,
#          fun and games vocabulary
# ════════════════════════════════════════════════════════════════════════════
r1 = load(1)
r1["totalPoints"] = 50
r1["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 10},
        "items": [
            {"sentence": "She ...... TV every evening after dinner.",
             "options": ["A watches", "B is watching", "C watched", "D has watched"], "answer": "A"},
            {"sentence": "Look! The children ...... in the garden.",
             "options": ["A play", "B played", "C are playing", "D have played"], "answer": "C"},
            {"sentence": "I ...... this song – can you turn it off?",
             "options": ["A am hating", "B hate", "C hated", "D was hating"], "answer": "B"},
            {"sentence": "Tom ...... a lot of coffee every morning.",
             "options": ["A is drinking", "B drink", "C drank", "D drinks"], "answer": "D"},
            {"sentence": "She ...... to music when I called her.",
             "options": ["A listens", "B is listening", "C listened", "D was listening"], "answer": "D"},
            {"sentence": "We always ...... him at the gym on weekday mornings.",
             "options": ["A are seeing", "B see", "C were seeing", "D have seen"], "answer": "B"},
            {"sentence": "Last night, while Dad ...... dinner, I set the table.",
             "options": ["A cooked", "B was cooking", "C cooks", "D is cooking"], "answer": "B"},
            {"sentence": "She ...... for her keys for twenty minutes before she found them.",
             "options": ["A searched", "B was searching", "C searches", "D is searching"], "answer": "B"},
            {"sentence": "I ...... that film – it's one of my favourites!",
             "options": ["A am loving", "B love", "C loved", "D was loving"], "answer": "B"},
            {"sentence": "They ...... a great time at the party last night.",
             "options": ["A are having", "B have", "C were having", "D had"], "answer": "D"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Key Word Transformation",
        "instructions": "Complete each second sentence using the word given, so that it has a similar meaning to the first sentence. Write between two and five words.",
        "scoring": {"pointsPerItem": 2, "maxScore": 20},
        "items": [
            {"sentence": "At school, Anna always sat near the back. **used**\nAnna ...... near the back at school.", "answer": "used to sit"},
            {"sentence": "Tom was cycling home when it started to rain. **when**\nIt started to rain ...... home.", "answer": "when Tom was cycling"},
            {"sentence": "Sally doesn't play tennis any more. **used**\nSally ...... tennis, but she no longer does.", "answer": "used to play"},
            {"sentence": "Joe found a wallet while he was walking to school. **was**\nJoe found a wallet while he ...... to school.", "answer": "was walking"},
            {"sentence": "My parents never ate fast food when I was a child. **used**\nMy parents ...... fast food when I was a child.", "answer": "never used to eat"},
            {"sentence": "The fire alarm rang while the teacher was explaining the lesson. **explaining**\nThe fire alarm rang while the teacher ...... the lesson.", "answer": "was explaining"},
            {"sentence": "We walked to school every day when we were young. **used**\nWe ...... to school every day when we were young.", "answer": "used to walk"},
            {"sentence": "She phoned while he was reading a book. **when**\nShe phoned ...... a book.", "answer": "when he was reading"},
            {"sentence": "Maria worked in a factory before she became a teacher. **used**\nMaria ...... in a factory before she became a teacher.", "answer": "used to work"},
            {"sentence": "The storm began while they were having dinner. **while**\nThe storm began ...... dinner.", "answer": "while they were having"}
        ]
    }
]
save(1, r1)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 2  A(8)+B(14)+C(6)+D(12)+E(10)=50
# Block 2: present perfect simple/continuous, past perfect simple/continuous,
#          learning and doing vocabulary
# ════════════════════════════════════════════════════════════════════════════
r2 = load(2)
r2["totalPoints"] = 50
r2["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 12},
        "items": [
            {"sentence": "How long ...... you ...... English?",
             "options": ["A did / learn", "B have / been learning", "C are / learning", "D had / learnt"], "answer": "B"},
            {"sentence": "I ...... three books this month already.",
             "options": ["A read", "B was reading", "C have read", "D had read"], "answer": "C"},
            {"sentence": "She ...... her homework before dinner last night.",
             "options": ["A finished", "B had finished", "C has finished", "D finishes"], "answer": "B"},
            {"sentence": "He ...... Spanish for six months, but he still can't speak it.",
             "options": ["A has been studying", "B studied", "C was studying", "D had studied"], "answer": "A"},
            {"sentence": "By the time I arrived, all the students ......",
             "options": ["A left", "B have left", "C had left", "D were leaving"], "answer": "C"},
            {"sentence": "I ...... this film yet. Is it good?",
             "options": ["A haven't seen", "B didn't see", "C hadn't seen", "D wasn't seeing"], "answer": "A"},
            {"sentence": "She ...... in Paris for five years before she moved to London.",
             "options": ["A has lived", "B lived", "C had lived", "D was living"], "answer": "C"},
            {"sentence": "He looks tired. He ...... all day.",
             "options": ["A worked", "B has been working", "C was working", "D had been working"], "answer": "B"},
            {"sentence": "I ...... him since we were at school together.",
             "options": ["A know", "B knew", "C have known", "D had known"], "answer": "C"},
            {"sentence": "When we got to the cinema, the film ......",
             "options": ["A already started", "B has already started", "C already starts", "D had already started"], "answer": "D"},
            {"sentence": "She ...... her driving test twice and is going to try again.",
             "options": ["A failed", "B had failed", "C has failed", "D was failing"], "answer": "C"},
            {"sentence": "I was exhausted because I ...... all night.",
             "options": ["A study", "B was studying", "C had been studying", "D have been studying"], "answer": "C"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 10},
        "items": [
            {"sentence": "My teacher asked me to **write / spell** my name on the board.", "answer": "write"},
            {"sentence": "You need to **revise / revive** your notes before the exam.", "answer": "revise"},
            {"sentence": "She got a perfect **grade / degree** in her science test.", "answer": "grade"},
            {"sentence": "Could you **explain / describe** what this word means?", "answer": "explain"},
            {"sentence": "He managed to **solve / answer** the maths problem in two minutes.", "answer": "solve"},
            {"sentence": "I always **attend / join** every lesson so I don't miss anything.", "answer": "attend"},
            {"sentence": "She has a natural **talent / skill** for learning languages quickly.", "answer": "talent"},
            {"sentence": "The teacher gave us a challenging **task / test** to complete at home.", "answer": "task"},
            {"sentence": "I need to **practise / exercise** my pronunciation more.", "answer": "practise"},
            {"sentence": "Can you **concentrate / focus** when there is a lot of noise around you?", "answer": "concentrate"}
        ]
    }
]
save(2, r2)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 3  A(10)+B(16)+C(8)+D(8)+E(8)=50  — only fix totalPoints
# ════════════════════════════════════════════════════════════════════════════
r3 = load(3)
r3["totalPoints"] = 50
save(3, r3)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 4  A(7)+B(5)+C(8)+D(10)+E(20)=50
# Block 4: passive (1), passive (2), friends and relations vocabulary
# ════════════════════════════════════════════════════════════════════════════
r4 = load(4)
r4["totalPoints"] = 50
r4["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 10},
        "items": [
            {"sentence": "This bridge ...... in 1850.",
             "options": ["A built", "B was built", "C is built", "D has built"], "answer": "B"},
            {"sentence": "The concert ...... because of the rain.",
             "options": ["A cancelled", "B has cancelled", "C was cancelled", "D is cancelling"], "answer": "C"},
            {"sentence": "English ...... all over the world.",
             "options": ["A speaks", "B is spoken", "C was spoken", "D spoke"], "answer": "B"},
            {"sentence": "The windows ...... every week by the cleaner.",
             "options": ["A clean", "B are cleaned", "C cleaned", "D were cleaning"], "answer": "B"},
            {"sentence": "The package ...... to the wrong address.",
             "options": ["A delivered", "B has delivered", "C was delivered", "D is delivering"], "answer": "C"},
            {"sentence": "The new hospital ...... next year.",
             "options": ["A is built", "B is going to build", "C will build", "D will be built"], "answer": "D"},
            {"sentence": "He ...... for a crime he didn't commit.",
             "options": ["A arrested", "B was arrested", "C has arrested", "D is arresting"], "answer": "B"},
            {"sentence": "The results ...... announced on Friday.",
             "options": ["A will", "B are going to be", "C were", "D are being"], "answer": "B"},
            {"sentence": "I ...... to wait outside for an hour.",
             "options": ["A asked", "B was asked", "C were asked", "D have asked"], "answer": "B"},
            {"sentence": "The letters ...... by the secretary every morning.",
             "options": ["A are typed", "B type", "C typed", "D is typed"], "answer": "A"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Key Word Transformation",
        "instructions": "Complete each second sentence using the word given, so that it has a similar meaning to the first sentence. Write between two and five words.",
        "scoring": {"pointsPerItem": 2, "maxScore": 20},
        "items": [
            {"sentence": "Someone stole my bike last night. **was**\nMy bike ...... last night.", "answer": "was stolen"},
            {"sentence": "People use this hall for concerts. **used**\nThis hall ...... for concerts.", "answer": "is used"},
            {"sentence": "Nobody has ever climbed that mountain. **been**\nThat mountain ...... climbed.", "answer": "has never been"},
            {"sentence": "They are going to renovate the old theatre. **going**\nThe old theatre ...... renovated.", "answer": "is going to be"},
            {"sentence": "The teacher punished the students for being late. **were**\nThe students ...... for being late.", "answer": "were punished by the teacher"},
            {"sentence": "Somebody had eaten all the cake before I arrived. **been**\nAll the cake ...... before I arrived.", "answer": "had been eaten"},
            {"sentence": "My brother and I don't argue very often. **rarely**\nMy brother and I ...... each other.", "answer": "rarely argue with"},
            {"sentence": "Tim and Sue became friends when they were seven. **friends**\nTim and Sue ...... when they were seven.", "answer": "made friends"},
            {"sentence": "She's been with her boyfriend for two years. **going**\nShe ...... her boyfriend for two years.", "answer": "has been going out with"},
            {"sentence": "Scientists discovered penicillin in 1928. **discovered**\nPenicillin ...... in 1928.", "answer": "was discovered by scientists"}
        ]
    }
]
save(4, r4)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 5  A(10)+B(8)+C(6)+D(10)+E(16)=50
# Block 5: countable/uncountable, articles, buying and selling vocabulary
# ════════════════════════════════════════════════════════════════════════════
r5 = load(5)
r5["totalPoints"] = 50
r5["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 10},
        "items": [
            {"sentence": "Can you pass me ...... salt, please?",
             "options": ["A a", "B the", "C some", "D any"], "answer": "B"},
            {"sentence": "I'd like ...... apple from the bowl.",
             "options": ["A a", "B an", "C some", "D the"], "answer": "B"},
            {"sentence": "She gave me ...... useful advice about my studies.",
             "options": ["A a", "B an", "C some", "D many"], "answer": "C"},
            {"sentence": "There's ...... milk left in the bottle.",
             "options": ["A a few", "B little", "C few", "D many"], "answer": "B"},
            {"sentence": "I need ...... bread from the shop.",
             "options": ["A a", "B an", "C few", "D some"], "answer": "D"},
            {"sentence": "Have you got ...... time to help me with this?",
             "options": ["A many", "B a few", "C a little", "D few"], "answer": "C"},
            {"sentence": "The Amazon is ...... longest river in South America.",
             "options": ["A a", "B an", "C the", "D –"], "answer": "C"},
            {"sentence": "Do you want to go to ...... cinema tonight?",
             "options": ["A a", "B an", "C the", "D –"], "answer": "C"},
            {"sentence": "I usually have ...... breakfast at seven o'clock.",
             "options": ["A the", "B a", "C –", "D some"], "answer": "C"},
            {"sentence": "We don't have ...... time left. We must hurry.",
             "options": ["A much", "B many", "C a few", "D a little"], "answer": "A"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 16},
        "items": [
            {"sentence": "Could you give me a **receipt / recipe** for this purchase?", "answer": "receipt"},
            {"sentence": "I got a great **bargain / balance** – this coat was half price!", "answer": "bargain"},
            {"sentence": "The shop gives a full **refund / fund** if you return the item within 30 days.", "answer": "refund"},
            {"sentence": "My mum loves **window / glass** shopping – she looks but rarely buys.", "answer": "window"},
            {"sentence": "We need to stick to our **budget / wages** and not overspend.", "answer": "budget"},
            {"sentence": "I'm saving up so I can **afford / achieve** a new laptop.", "answer": "afford"},
            {"sentence": "There's a big **sale / sell** at the department store this weekend.", "answer": "sale"},
            {"sentence": "Can I pay by **credit / trust** card?", "answer": "credit"},
            {"sentence": "Could you **wrap / pack** this as a gift, please?", "answer": "wrap"},
            {"sentence": "I'd like to **exchange / change** this shirt for a larger size.", "answer": "exchange"},
            {"sentence": "You can get a 20% **discount / difference** if you buy two items.", "answer": "discount"},
            {"sentence": "The **checkout / exit** queue at the supermarket was really long today.", "answer": "checkout"},
            {"sentence": "I don't like **haggling / arguing** over prices at the market.", "answer": "haggling"},
            {"sentence": "She spent her whole **salary / pay** on clothes last month!", "answer": "salary"},
            {"sentence": "If you're short of money, you can **borrow / lend** some from the bank.", "answer": "borrow"},
            {"sentence": "The price **tag / label** on the jacket says it costs £80.", "answer": "tag"}
        ]
    }
]
save(5, r5)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 6  A(16)+B(8)+C(4)+D(10)+E(12)=50
# Block 6: pronouns/possessive determiners, relative clauses,
#          inventions and discoveries vocabulary
# ════════════════════════════════════════════════════════════════════════════
r6 = load(6)
r6["totalPoints"] = 50
r6["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 10},
        "items": [
            {"sentence": "The man ...... lives next door is a doctor.",
             "options": ["A who", "B which", "C whose", "D whom"], "answer": "A"},
            {"sentence": "Is this the hotel ...... we stayed last year?",
             "options": ["A who", "B that", "C where", "D whose"], "answer": "C"},
            {"sentence": "The book ...... I'm reading is very interesting.",
             "options": ["A who", "B where", "C whose", "D which"], "answer": "D"},
            {"sentence": "She's the scientist ...... discovery changed the world.",
             "options": ["A who", "B which", "C whose", "D that"], "answer": "C"},
            {"sentence": "This is the office ...... I work every day.",
             "options": ["A which", "B where", "C who", "D whose"], "answer": "B"},
            {"sentence": "The phone, ...... costs a lot, is very popular.",
             "options": ["A who", "B that", "C which", "D where"], "answer": "C"},
            {"sentence": "Everyone ...... attended the ceremony enjoyed it.",
             "options": ["A who", "B which", "C where", "D whose"], "answer": "A"},
            {"sentence": "Give the key to ...... arrives first.",
             "options": ["A who", "B whoever", "C that", "D which"], "answer": "B"},
            {"sentence": "That's the woman ...... bag was stolen.",
             "options": ["A who", "B which", "C that", "D whose"], "answer": "D"},
            {"sentence": "The year ...... the internet became popular changed everything.",
             "options": ["A when", "B where", "C which", "D who"], "answer": "A"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Word formation",
        "instructions": "Complete by changing the form of the word in capitals.",
        "scoring": {"pointsPerItem": 1, "maxScore": 12},
        "items": [
            {"sentence": "Galileo was a famous ...... who studied the stars. (SCIENCE)", "answer": "scientist"},
            {"sentence": "The ...... of the telephone changed communication forever. (INVENT)", "answer": "invention"},
            {"sentence": "The new drug has been very ...... in treating the illness. (BENEFIT)", "answer": "beneficial"},
            {"sentence": "She was so ...... when she received the science prize. (PRIDE)", "answer": "proud"},
            {"sentence": "Nuclear power is one of the most ...... sources of energy. (POWER)", "answer": "powerful"},
            {"sentence": "The ...... of DNA is considered one of the greatest scientific achievements. (DISCOVER)", "answer": "discovery"},
            {"sentence": "We need to find ...... ways of producing energy. (RENEW)", "answer": "renewable"},
            {"sentence": "The results of the experiment were quite ...... . (SURPRISE)", "answer": "surprising"},
            {"sentence": "The new medicine proved ...... in treating the illness. (EFFECT)", "answer": "effective"},
            {"sentence": "Many people are worried about the ...... effects of air pollution. (HARM)", "answer": "harmful"},
            {"sentence": "The Internet has made ...... much easier and faster. (COMMUNICATE)", "answer": "communication"},
            {"sentence": "His ...... of the night sky led to many important discoveries. (OBSERVE)", "answer": "observation"}
        ]
    }
]
save(6, r6)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 7  A(10)+B(8)+C(10)+D(10)+E(12)=50
# Block 7: modals ability/permission/advice, modals obligation/probability/
#          possibility, sending and receiving vocabulary
# ════════════════════════════════════════════════════════════════════════════
r7 = load(7)
r7["totalPoints"] = 50
r7["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 10},
        "items": [
            {"sentence": "You ...... take photos in the museum. It's not allowed.",
             "options": ["A mustn't", "B don't have to", "C couldn't", "D needn't"], "answer": "A"},
            {"sentence": "She ...... drive when she was fifteen.",
             "options": ["A could", "B can", "C was able", "D might"], "answer": "A"},
            {"sentence": "You look tired. You ...... take a break.",
             "options": ["A must", "B might", "C should", "D have to"], "answer": "C"},
            {"sentence": "It ...... rain tomorrow. Take an umbrella just in case.",
             "options": ["A should", "B might", "C must", "D ought"], "answer": "B"},
            {"sentence": "You ...... wear a seat belt. It's the law.",
             "options": ["A should", "B can", "C must", "D might"], "answer": "C"},
            {"sentence": "He ...... come to the party; it's entirely up to him.",
             "options": ["A must", "B doesn't have to", "C can't", "D mustn't"], "answer": "B"},
            {"sentence": "You ...... worry – you know all the answers!",
             "options": ["A must", "B should", "C don't have to", "D needn't"], "answer": "D"},
            {"sentence": "She ...... be at home – I just saw her in town.",
             "options": ["A must", "B can't", "C might", "D should"], "answer": "B"},
            {"sentence": "...... I open the window? It's very warm in here.",
             "options": ["A Must", "B Should", "C May", "D Need"], "answer": "C"},
            {"sentence": "You ...... be more careful with your money!",
             "options": ["A must", "B ought to", "C might", "D needn't"], "answer": "B"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 12},
        "items": [
            {"sentence": "I got an important **message / news** from my teacher on my phone.", "answer": "message"},
            {"sentence": "She sent me a **parcel / package** for my birthday with lots of gifts.", "answer": "parcel"},
            {"sentence": "Can you **forward / send** this email to the rest of the team?", "answer": "forward"},
            {"sentence": "He **missed / ignored** the call because his phone was on silent.", "answer": "missed"},
            {"sentence": "Please **sign / mark** here to confirm you received the delivery.", "answer": "sign"},
            {"sentence": "I'll **attach / connect** the document to the email before sending it.", "answer": "attach"},
            {"sentence": "The **postage / postal** on the parcel was very expensive.", "answer": "postage"},
            {"sentence": "She left me a **voice / sound** message because I wasn't available.", "answer": "voice"},
            {"sentence": "Could you **reply / respond** to my message as soon as possible?", "answer": "reply"},
            {"sentence": "He sent a **formal / official** letter to the company to complain.", "answer": "formal"},
            {"sentence": "The letter had the wrong **address / location** on the envelope.", "answer": "address"},
            {"sentence": "I need to **upload / download** my photos to share them online.", "answer": "upload"}
        ]
    }
]
save(7, r7)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 8  A(8)+B(6)+C(4)+D(16)+E(16)=50
# Block 8: modal perfect, questions/question tags, people and daily life vocab
# ════════════════════════════════════════════════════════════════════════════
r8 = load(8)
r8["totalPoints"] = 50
r8["sections"] += [
    {
        "type": "exercise",
        "title": "D: Key Word Transformation",
        "instructions": "Complete each second sentence using the word given, so that it has a similar meaning to the first sentence. Write between two and five words.",
        "scoring": {"pointsPerItem": 2, "maxScore": 16},
        "items": [
            {"sentence": "I'm almost sure Lucy took my pen. **must**\nLucy ...... my pen.", "answer": "must have taken"},
            {"sentence": "It wasn't necessary for him to bring food. **need**\nHe ...... food.", "answer": "didn't need to bring"},
            {"sentence": "'Where do you live?' the officer asked him. **where**\nThe officer asked him ...... .", "answer": "where he lived"},
            {"sentence": "I'm certain she didn't see us. **can't**\nShe ...... us.", "answer": "can't have seen"},
            {"sentence": "'Are you feeling better?' the doctor asked her. **whether**\nThe doctor asked her ...... better.", "answer": "whether she was feeling"},
            {"sentence": "He definitely passed the exam. **must**\nHe ...... the exam.", "answer": "must have passed"},
            {"sentence": "'Did you post the letter?' she asked me. **had**\nShe asked me whether I ...... the letter.", "answer": "had posted"},
            {"sentence": "He didn't come to school – maybe he was sick. **might**\nHe ...... sick, which is why he didn't come to school.", "answer": "might have been"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 16},
        "items": [
            {"sentence": "My dad always **does / makes** the shopping on Saturdays.", "answer": "does"},
            {"sentence": "I need to **wash / clean** the dishes after dinner.", "answer": "wash"},
            {"sentence": "She **goes / makes** jogging every morning before work.", "answer": "goes"},
            {"sentence": "Can you **set / put** the table? Dinner is almost ready.", "answer": "set"},
            {"sentence": "I forgot to **take / bring** out the rubbish this morning.", "answer": "take"},
            {"sentence": "My mum usually **does / makes** breakfast at seven o'clock.", "answer": "makes"},
            {"sentence": "He's always too tired to **hang / put** up his clothes properly.", "answer": "hang"},
            {"sentence": "I need to **tidy / clean** my bedroom – it's a mess!", "answer": "tidy"},
            {"sentence": "We usually **have / do** a family meal together on Sundays.", "answer": "have"},
            {"sentence": "She always **goes / does** to bed early because she starts work at six.", "answer": "goes"},
            {"sentence": "It's my turn to **walk / take** the dog tonight.", "answer": "walk"},
            {"sentence": "I need to **charge / fill** my phone – the battery is almost dead.", "answer": "charge"},
            {"sentence": "My brother never **helps / does** with the household chores.", "answer": "helps"},
            {"sentence": "She **woke / got** up late and missed the bus.", "answer": "woke"},
            {"sentence": "I usually **spend / pass** about an hour a day on social media.", "answer": "spend"},
            {"sentence": "Can you **turn / switch** off the lights before you leave?", "answer": "turn"}
        ]
    }
]
save(8, r8)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 9  A(10)+B(8)+C(4)+D(14)+E(14)=50
# Block 9: so/such/too/enough, comparatives/superlatives,
#          working and earning vocabulary
# ════════════════════════════════════════════════════════════════════════════
r9 = load(9)
r9["totalPoints"] = 50
r9["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "This is ...... expensive coffee I've ever had.",
             "options": ["A most", "B the most", "C more", "D such"], "answer": "B"},
            {"sentence": "She speaks French ...... better than I do.",
             "options": ["A much", "B very", "C more", "D quite"], "answer": "A"},
            {"sentence": "The film was ...... boring that I fell asleep.",
             "options": ["A so", "B such", "C too", "D enough"], "answer": "A"},
            {"sentence": "It's ...... a beautiful day that we should go to the park!",
             "options": ["A so", "B such", "C very", "D too"], "answer": "B"},
            {"sentence": "Is your new flat ...... than the old one?",
             "options": ["A biggest", "B more big", "C bigger", "D big"], "answer": "C"},
            {"sentence": "The suitcase is ...... heavy for me to carry.",
             "options": ["A so", "B such", "C very", "D too"], "answer": "D"},
            {"sentence": "She wasn't ...... to drive home safely.",
             "options": ["A sober enough", "B enough sober", "C so sober", "D such sober"], "answer": "A"},
            {"sentence": "He's ...... taller than his brother.",
             "options": ["A bit", "B a bit", "C much", "D slightly more"], "answer": "B"},
            {"sentence": "She's ...... clever ...... pass any exam easily.",
             "options": ["A enough / to", "B so / that", "C too / to", "D such / that"], "answer": "A"},
            {"sentence": "He plays guitar ...... as his teacher.",
             "options": ["A so well", "B as well", "C better than", "D good as"], "answer": "B"},
            {"sentence": "The weather is getting ...... and ...... each day.",
             "options": ["A hot, hotter", "B hotter, hotter", "C more hot, more hot", "D hot, hot"], "answer": "B"},
            {"sentence": "It was ...... a long journey that I slept for most of the way.",
             "options": ["A so", "B enough", "C such", "D too"], "answer": "C"},
            {"sentence": "He's ...... the best player in the team.",
             "options": ["A by far", "B with far", "C much far", "D quite far"], "answer": "A"},
            {"sentence": "She ran ...... fast that nobody could catch her.",
             "options": ["A so", "B such", "C too", "D enough"], "answer": "A"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Word formation",
        "instructions": "Complete by changing the form of the word in capitals.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "She is very ...... and never gives up on a problem. (DETERMINE)", "answer": "determined"},
            {"sentence": "He works as an ...... at a large city bank. (ACCOUNT)", "answer": "accountant"},
            {"sentence": "All ...... should report to the main office first thing in the morning. (EMPLOY)", "answer": "employees"},
            {"sentence": "The company is looking for candidates with good ...... skills. (ORGANISE)", "answer": "organisational"},
            {"sentence": "She made an excellent ...... after her first meeting with the directors. (IMPRESS)", "answer": "impression"},
            {"sentence": "The new contract offers better ...... conditions for all staff. (WORK)", "answer": "working"},
            {"sentence": "He handed in his ...... and left the company the next day. (RESIGN)", "answer": "resignation"},
            {"sentence": "The job is very ......, but the salary is very good. (DEMAND)", "answer": "demanding"},
            {"sentence": "It's important to be ...... when applying for a new job. (PROFESSION)", "answer": "professional"},
            {"sentence": "The report was ...... well-written and impressed the whole board. (EXCEPTION)", "answer": "exceptionally"},
            {"sentence": "She has a very ...... manner when dealing with customers. (PLEASE)", "answer": "pleasant"},
            {"sentence": "Good ...... is essential when working in a team. (COMMUNICATE)", "answer": "communication"},
            {"sentence": "His ...... allowed him to work from home three days a week. (MANAGE)", "answer": "manager"},
            {"sentence": "Staff ...... is important for a happy and productive workplace. (SATISFY)", "answer": "satisfaction"}
        ]
    }
]
save(9, r9)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 10  A(10)+B(8)+C(5)+D(14)+E(13)=50
# Block 10: conditionals zero/first/second, third conditional,
#           body and lifestyle vocabulary
# ════════════════════════════════════════════════════════════════════════════
r10 = load(10)
r10["totalPoints"] = 50
r10["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "If you heat water to 100°C, it ......",
             "options": ["A boils", "B would boil", "C had boiled", "D boiled"], "answer": "A"},
            {"sentence": "If I ...... more time, I'd study another language.",
             "options": ["A had", "B have", "C would have", "D will have"], "answer": "A"},
            {"sentence": "I ...... you if I have any news.",
             "options": ["A call", "B would call", "C will call", "D called"], "answer": "C"},
            {"sentence": "If she ...... harder, she would pass the exam.",
             "options": ["A studied", "B studies", "C will study", "D would study"], "answer": "A"},
            {"sentence": "You won't catch the train unless you ...... now.",
             "options": ["A leave", "B would leave", "C left", "D had left"], "answer": "A"},
            {"sentence": "If he ...... earlier, he would have caught the bus.",
             "options": ["A leaves", "B left", "C had left", "D would leave"], "answer": "C"},
            {"sentence": "What ...... if there were no internet?",
             "options": ["A happens", "B would happen", "C will happen", "D had happened"], "answer": "B"},
            {"sentence": "If I ...... you were ill, I would have visited you.",
             "options": ["A knew", "B know", "C had known", "D have known"], "answer": "C"},
            {"sentence": "She ...... angry if you forget her birthday.",
             "options": ["A is", "B will be", "C would be", "D was"], "answer": "B"},
            {"sentence": "If I ...... a million euros, I'd buy a house by the sea.",
             "options": ["A won", "B win", "C would win", "D had won"], "answer": "A"},
            {"sentence": "If they ...... the match, they would have won the trophy.",
             "options": ["A won", "B had won", "C would win", "D win"], "answer": "B"},
            {"sentence": "Water freezes if the temperature ...... below zero.",
             "options": ["A fell", "B falls", "C would fall", "D had fallen"], "answer": "B"},
            {"sentence": "We ...... go camping if the weather is good this weekend.",
             "options": ["A might", "B would", "C had", "D were"], "answer": "A"},
            {"sentence": "If she ...... more careful, she wouldn't have had the accident.",
             "options": ["A is", "B were", "C had been", "D would be"], "answer": "C"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 13},
        "items": [
            {"sentence": "I need to **get / go** some exercise – I've been sitting all day.", "answer": "get"},
            {"sentence": "She always eats **healthily / healthy** and rarely gets ill.", "answer": "healthily"},
            {"sentence": "He's been feeling **under / below** the weather lately.", "answer": "under"},
            {"sentence": "I need to **do / make** more sport to stay fit.", "answer": "do"},
            {"sentence": "She goes to the gym to **work / train** out three times a week.", "answer": "work"},
            {"sentence": "A balanced **diet / nutrition** is important for good health.", "answer": "diet"},
            {"sentence": "He had a serious **operation / treatment** on his knee last month.", "answer": "operation"},
            {"sentence": "The doctor told her to **reduce / lower** her salt intake.", "answer": "reduce"},
            {"sentence": "She takes **vitamins / minerals** every morning to boost her health.", "answer": "vitamins"},
            {"sentence": "Getting enough **sleep / rest** is essential for your wellbeing.", "answer": "sleep"},
            {"sentence": "He's been **taking / making** medicine for his back pain.", "answer": "taking"},
            {"sentence": "She joined a fitness **class / lesson** to improve her health.", "answer": "class"},
            {"sentence": "The doctor said I need to **get / have** a check-up.", "answer": "have"}
        ]
    }
]
save(10, r10)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 11  A(10)+B(8)+C(4)+D(14)+E(14)=50
# Block 11: reported speech, reported questions/orders,
#           creating and building vocabulary
# ════════════════════════════════════════════════════════════════════════════
r11 = load(11)
r11["totalPoints"] = 50
r11["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "She said she ...... tired.",
             "options": ["A is", "B was", "C has been", "D would be"], "answer": "B"},
            {"sentence": "He told me ...... late.",
             "options": ["A not be", "B not to be", "C don't be", "D to not be"], "answer": "B"},
            {"sentence": "She asked me where ...... .",
             "options": ["A do I live", "B I live", "C I lived", "D did I live"], "answer": "C"},
            {"sentence": "He said he ...... the day before.",
             "options": ["A arrived", "B had arrived", "C arrives", "D has arrived"], "answer": "B"},
            {"sentence": "She told us ...... quiet during the exam.",
             "options": ["A be", "B to be", "C being", "D we be"], "answer": "B"},
            {"sentence": "He asked if I ...... come to his party.",
             "options": ["A can", "B could", "C will", "D am"], "answer": "B"},
            {"sentence": "The teacher said we ...... finish the test by noon.",
             "options": ["A must", "B had to", "C have to", "D should"], "answer": "B"},
            {"sentence": "She said she ...... to Paris the following week.",
             "options": ["A travels", "B was going to travel", "C is going to travel", "D travelled"], "answer": "B"},
            {"sentence": "They told me ...... the door when I left.",
             "options": ["A lock", "B to lock", "C locking", "D locked"], "answer": "B"},
            {"sentence": "He asked ...... the report was ready.",
             "options": ["A when", "B if", "C who", "D how"], "answer": "B"},
            {"sentence": "She told him ...... before ten o'clock.",
             "options": ["A to come", "B come", "C coming", "D to coming"], "answer": "A"},
            {"sentence": "He said that he ...... the film yet.",
             "options": ["A hasn't seen", "B didn't see", "C hadn't seen", "D doesn't see"], "answer": "C"},
            {"sentence": "The teacher asked me what ...... .",
             "options": ["A was my name", "B my name was", "C is my name", "D my name is"], "answer": "B"},
            {"sentence": "She told her friend ...... .",
             "options": ["A not worry", "B don't worry", "C not to worry", "D to not worry"], "answer": "C"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "She used a **brush / pencil** to paint the watercolour.", "answer": "brush"},
            {"sentence": "The architect spent weeks working on the building **design / drawing**.", "answer": "design"},
            {"sentence": "They plan to **restore / rebuild** the old cathedral to its original state.", "answer": "restore"},
            {"sentence": "He spent the afternoon **sketching / painting** the view from his window.", "answer": "sketching"},
            {"sentence": "The **sculpture / painting** was made from white marble.", "answer": "sculpture"},
            {"sentence": "She took a **craft / arts** class to learn how to make pottery.", "answer": "craft"},
            {"sentence": "The artist painted on a large **canvas / board**.", "answer": "canvas"},
            {"sentence": "The builders used **concrete / cement** to lay the foundations of the building.", "answer": "concrete"},
            {"sentence": "She has a very **creative / talent** mind and comes up with great ideas.", "answer": "creative"},
            {"sentence": "He wanted to **renovate / decorate** the old farmhouse and sell it.", "answer": "renovate"},
            {"sentence": "The museum has a wonderful **collection / set** of ancient sculptures.", "answer": "collection"},
            {"sentence": "She **moulded / shaped** the clay into the form of a horse.", "answer": "moulded"},
            {"sentence": "The **architect / engineer** designed the new suspension bridge.", "answer": "architect"},
            {"sentence": "He uses **clay / dough** to make his hand-made pottery bowls.", "answer": "clay"}
        ]
    }
]
save(11, r11)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 12  A(6)+B(8)+C(6)+D(15)+E(15)=50
# Block 12: direct/indirect objects, wish,
#           nature and the universe vocabulary
# ════════════════════════════════════════════════════════════════════════════
r12 = load(12)
r12["totalPoints"] = 50
r12["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 15},
        "items": [
            {"sentence": "She ...... me an email to confirm the meeting.",
             "options": ["A sent", "B gave", "C brought", "D posted"], "answer": "A"},
            {"sentence": "He ...... us the answer after thinking for a while.",
             "options": ["A said", "B told", "C gave", "D described"], "answer": "B"},
            {"sentence": "Could you ...... me the salt, please?",
             "options": ["A bring", "B pass", "C get", "D give"], "answer": "B"},
            {"sentence": "She read the children ...... a bedtime story.",
             "options": ["A for", "B to", "C aloud", "D them"], "answer": "A"},
            {"sentence": "Can you ...... me the time?",
             "options": ["A tell", "B say", "C give", "D speak"], "answer": "A"},
            {"sentence": "He ...... his laptop to his brother for the weekend.",
             "options": ["A lent", "B borrowed", "C showed", "D gave"], "answer": "A"},
            {"sentence": "I wish I ...... drive – it would make life so much easier.",
             "options": ["A can", "B could", "C would", "D should"], "answer": "B"},
            {"sentence": "I wish you ...... make so much noise!",
             "options": ["A wouldn't", "B don't", "C won't", "D didn't"], "answer": "A"},
            {"sentence": "She wishes she ...... a better memory.",
             "options": ["A has", "B had", "C would have", "D could have"], "answer": "B"},
            {"sentence": "I wish it ...... so cold today.",
             "options": ["A isn't", "B wasn't", "C weren't", "D wouldn't be"], "answer": "C"},
            {"sentence": "He wishes he ...... harder when he was at school.",
             "options": ["A studied", "B had studied", "C would study", "D studies"], "answer": "B"},
            {"sentence": "I wish I ...... bring you better news, but I can't.",
             "options": ["A can", "B could", "C would", "D should"], "answer": "B"},
            {"sentence": "She wishes she ...... the lottery so she could travel the world.",
             "options": ["A wins", "B won", "C would win", "D had won"], "answer": "B"},
            {"sentence": "He wishes he ...... that rude comment to his boss.",
             "options": ["A didn't make", "B hadn't made", "C wouldn't make", "D won't make"], "answer": "B"},
            {"sentence": "I wish the weather ...... better for our picnic.",
             "options": ["A is", "B was", "C were", "D would be"], "answer": "C"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 15},
        "items": [
            {"sentence": "The night sky was full of **stars / planets** – thousands of them.", "answer": "stars"},
            {"sentence": "An **earthquake / eruption** destroyed much of the city last year.", "answer": "earthquake"},
            {"sentence": "Water **falls / flows** gently over the waterfall into the river below.", "answer": "falls"},
            {"sentence": "Many **species / sorts** of animals are endangered today.", "answer": "species"},
            {"sentence": "The **atmosphere / surroundings** around the Earth protects us from harmful rays.", "answer": "atmosphere"},
            {"sentence": "The volcano suddenly **erupted / exploded**, covering the village in ash.", "answer": "erupted"},
            {"sentence": "A severe **drought / flood** meant there wasn't enough water for the crops.", "answer": "drought"},
            {"sentence": "We explored a dark **cave / hole** in the side of the mountain.", "answer": "cave"},
            {"sentence": "He stood at the top of the **cliff / hill** and looked down at the sea.", "answer": "cliff"},
            {"sentence": "A **glacier / iceberg** is a slow-moving river of ice found in cold regions.", "answer": "glacier"},
            {"sentence": "The **habitat / area** of the polar bear is threatened by climate change.", "answer": "habitat"},
            {"sentence": "There was a huge **tsunami / wave** after the earthquake under the sea.", "answer": "tsunami"},
            {"sentence": "She watched the **lightning / thunder** strike the top of the tall tree.", "answer": "lightning"},
            {"sentence": "The thick **jungle / forest** was home to hundreds of different animal species.", "answer": "jungle"},
            {"sentence": "The bright **meteor / comet** streaked across the night sky and disappeared.", "answer": "meteor"}
        ]
    }
]
save(12, r12)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 13  A(8)+B(8)+C(6)+D(14)+E(14)=50
# Block 13: -ing and infinitive, both/either/neither/so/nor,
#           laughing and crying vocabulary
# ════════════════════════════════════════════════════════════════════════════
r13 = load(13)
r13["totalPoints"] = 50
r13["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "I enjoy ...... films at the cinema.",
             "options": ["A to watch", "B watching", "C watch", "D watched"], "answer": "B"},
            {"sentence": "She promised ...... on time.",
             "options": ["A arriving", "B to arrive", "C arrive", "D that arrives"], "answer": "B"},
            {"sentence": "He stopped ...... coffee after the doctor's advice.",
             "options": ["A to drink", "B drinking", "C drink", "D that drinking"], "answer": "B"},
            {"sentence": "I need ...... you something important.",
             "options": ["A telling", "B to tell", "C tell", "D told"], "answer": "B"},
            {"sentence": "...... of the answers is correct – they're both wrong.",
             "options": ["A Both", "B Either", "C Neither", "D Each"], "answer": "C"},
            {"sentence": "She agreed ...... for the holiday.",
             "options": ["A paying", "B to pay", "C pay", "D that pays"], "answer": "B"},
            {"sentence": "I don't like swimming and ...... does my sister.",
             "options": ["A neither", "B either", "C so", "D both"], "answer": "A"},
            {"sentence": "He avoided ...... to the dentist for years.",
             "options": ["A going", "B to go", "C go", "D that goes"], "answer": "A"},
            {"sentence": "She's good at ...... people laugh.",
             "options": ["A making", "B to make", "C make", "D makes"], "answer": "A"},
            {"sentence": "...... of us wanted to go, so we stayed at home.",
             "options": ["A Either", "B Neither", "C Both", "D None"], "answer": "B"},
            {"sentence": "I forgot ...... the door when I left.",
             "options": ["A leaving", "B to lock", "C lock", "D locked"], "answer": "B"},
            {"sentence": "She tried ...... the shelf but couldn't reach it.",
             "options": ["A jumping", "B to reach", "C reach", "D that reaches"], "answer": "B"},
            {"sentence": "'I love comedy films.' 'Me ...... – they're so funny!'",
             "options": ["A too", "B also", "C so", "D neither"], "answer": "C"},
            {"sentence": "Both the painting ...... the sculpture were beautiful.",
             "options": ["A and", "B or", "C nor", "D but"], "answer": "A"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "The baby started to **cry / weep** because it was hungry.", "answer": "cry"},
            {"sentence": "She couldn't stop **laughing / giggling** at the very funny joke.", "answer": "laughing"},
            {"sentence": "He **grinned / smiled** from ear to ear when he heard the good news.", "answer": "grinned"},
            {"sentence": "She was so nervous that her hands started to **shake / tremble**.", "answer": "tremble"},
            {"sentence": "He let out a loud **scream / yell** when he saw the spider.", "answer": "scream"},
            {"sentence": "She **whispered / mumbled** the answer so only I could hear.", "answer": "whispered"},
            {"sentence": "He **blushed / turned** red with embarrassment after the mistake.", "answer": "blushed"},
            {"sentence": "She gave a deep **sigh / breath** of relief when she heard the news.", "answer": "sigh"},
            {"sentence": "The children **giggled / laughed** quietly at the teacher's mistake.", "answer": "giggled"},
            {"sentence": "She **frowned / scowled** when she read the bad review of her work.", "answer": "frowned"},
            {"sentence": "He **shrugged / nodded** his shoulders when asked if he knew the answer.", "answer": "shrugged"},
            {"sentence": "She **burst / broke** into tears when she heard the sad news.", "answer": "burst"},
            {"sentence": "The crowd **cheered / shouted** with joy when their team scored.", "answer": "cheered"},
            {"sentence": "He **gasped / choked** with surprise when he saw the size of the cake.", "answer": "gasped"}
        ]
    }
]
save(13, r13)

# ════════════════════════════════════════════════════════════════════════════
# REVIEW 14  A(8)+B(6)+C(8)+D(14)+E(14)=50
# Block 14: connectives, the causative, problems and solutions vocabulary
# ════════════════════════════════════════════════════════════════════════════
r14 = load(14)
r14["totalPoints"] = 50
r14["sections"] += [
    {
        "type": "exercise",
        "title": "D: Choose the correct answer",
        "instructions": "Choose the correct answer.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "She was tired, ...... she decided to take a nap.",
             "options": ["A but", "B so", "C although", "D however"], "answer": "B"},
            {"sentence": "I had my hair ...... at the salon yesterday.",
             "options": ["A cut", "B to cut", "C cutting", "D cuts"], "answer": "A"},
            {"sentence": "...... he was tired, he carried on working.",
             "options": ["A So", "B Because", "C Although", "D Therefore"], "answer": "C"},
            {"sentence": "She had her car ...... after the accident.",
             "options": ["A repaired", "B repairing", "C to repair", "D repair"], "answer": "A"},
            {"sentence": "We arrived late ...... the heavy traffic.",
             "options": ["A despite", "B although", "C because of", "D so that"], "answer": "C"},
            {"sentence": "...... a result, the company decided to close the factory.",
             "options": ["A So", "B As", "C Because", "D However"], "answer": "B"},
            {"sentence": "He had the packages ...... to his house.",
             "options": ["A delivering", "B to deliver", "C delivered", "D deliver"], "answer": "C"},
            {"sentence": "She ate a lot ...... she wasn't hungry.",
             "options": ["A even though", "B because", "C so", "D therefore"], "answer": "A"},
            {"sentence": "I'll help you ...... you help me too.",
             "options": ["A so that", "B in order to", "C as long as", "D so"], "answer": "C"},
            {"sentence": "She had her portrait ...... by a local artist.",
             "options": ["A painted", "B to paint", "C painting", "D paint"], "answer": "A"},
            {"sentence": "He left early ...... catch the first train.",
             "options": ["A so that", "B in order to", "C because", "D despite"], "answer": "B"},
            {"sentence": "...... having lots of money, she was very unhappy.",
             "options": ["A Although", "B Even though", "C Despite", "D However"], "answer": "C"},
            {"sentence": "She had her house ...... before putting it on the market.",
             "options": ["A renovated", "B renovating", "C to renovate", "D renovate"], "answer": "A"},
            {"sentence": "We studied hard; ...... we passed the exam.",
             "options": ["A however", "B although", "C as a result", "D even though"], "answer": "C"}
        ]
    },
    {
        "type": "exercise",
        "title": "E: Circle the correct word",
        "instructions": "Choose the correct option in each sentence.",
        "scoring": {"pointsPerItem": 1, "maxScore": 14},
        "items": [
            {"sentence": "She found a quick **solution / problem** to the technical issue.", "answer": "solution"},
            {"sentence": "He managed to **overcome / cause** the difficulties he faced.", "answer": "overcome"},
            {"sentence": "We need to **reduce / increase** the amount of plastic we use.", "answer": "reduce"},
            {"sentence": "She always **faces / avoids** her problems instead of running away from them.", "answer": "faces"},
            {"sentence": "He couldn't **cope / control** with all the work he had to do.", "answer": "cope"},
            {"sentence": "The government needs to **tackle / ignore** the housing crisis.", "answer": "tackle"},
            {"sentence": "They tried to **resolve / create** the conflict through negotiation.", "answer": "resolve"},
            {"sentence": "She decided to **approach / avoid** the problem from a different angle.", "answer": "approach"},
            {"sentence": "The new policy aims to **prevent / cause** accidents in the workplace.", "answer": "prevent"},
            {"sentence": "It took weeks to **solve / create** the mystery of the missing key.", "answer": "solve"},
            {"sentence": "The team worked together to **sort / mix** out the issues with the project.", "answer": "sort"},
            {"sentence": "She tried to **improve / worsen** the situation by offering to help.", "answer": "improve"},
            {"sentence": "The charity helps people who **struggle / succeed** with poverty.", "answer": "struggle"},
            {"sentence": "We should try to **fix / break** the problem rather than ignoring it.", "answer": "fix"}
        ]
    }
]
save(14, r14)

print("\nAll done!")

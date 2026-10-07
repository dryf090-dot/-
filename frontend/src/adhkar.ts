export type SoundId = "salawat" | "tahlil" | "tasbih" | "hamd" | "takbir" | "istighfar" | "adhan";

export type Dhikr = {
  id: Exclude<SoundId, "adhan">;
  title: string;
  text: string;
  virtue: string;
};

// Order matters: reminders rotate in this order (صلِّ على محمد ثم لا إله إلا الله ...).
export const ADHKAR: Dhikr[] = [
  {
    id: "salawat",
    title: "الصلاة على النبي ﷺ",
    text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّد",
    virtue: "من صلّى عليّ صلاةً صلّى الله عليه بها عشرًا",
  },
  {
    id: "tahlil",
    title: "التهليل",
    text: "لَا إِلَٰهَ إِلَّا اللَّه",
    virtue: "أفضل الذكر لا إله إلا الله",
  },
  {
    id: "tasbih",
    title: "التسبيح",
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيم",
    virtue: "كلمتان خفيفتان على اللسان، ثقيلتان في الميزان",
  },
  {
    id: "hamd",
    title: "التحميد",
    text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِين",
    virtue: "والحمد لله تملأ الميزان",
  },
  {
    id: "takbir",
    title: "التكبير",
    text: "اللَّهُ أَكْبَر، اللَّهُ أَكْبَر",
    virtue: "أحب الكلام إلى الله أربع، منها الله أكبر",
  },
  {
    id: "istighfar",
    title: "الاستغفار",
    text: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْه",
    virtue: "من لزم الاستغفار جعل الله له من كل همٍّ فرجًا",
  },
];

export const SOUNDS: Record<SoundId, number> = {
  salawat: require("../assets/sounds/salawat.wav"),
  tahlil: require("../assets/sounds/tahlil.wav"),
  tasbih: require("../assets/sounds/tasbih.wav"),
  hamd: require("../assets/sounds/hamd.wav"),
  takbir: require("../assets/sounds/takbir.wav"),
  istighfar: require("../assets/sounds/istighfar.wav"),
  adhan: require("../assets/sounds/adhan.wav"),
};

export const getDhikr = (id: string) => ADHKAR.find((d) => d.id === id);

// client/src/data/rosters2025.ts

export type RosterPlayer = {
    name: string;
    pos: string; // 1B, 2B, SS, 3B, OF, C, CM, MI, DH, P
  };
  
  export type TeamRoster2025 = {
    teamId: string;
    teamName: string;
    hitters: RosterPlayer[];
    pitchers: RosterPlayer[];
  };
  
  export const ROSTERS_2025: TeamRoster2025[] = [
    // Dodger Dawgs
    {
      teamId: "DodgerDawgs",
      teamName: "Dodger Dawgs",
      hitters: [
        { name: "C. Encarnacion-Strand", pos: "1B" },
        { name: "N. Hoerner", pos: "2B" },
        { name: "F. Lindor", pos: "SS" },
        { name: "E. Suarez", pos: "3B" },
        { name: "J. Chourio", pos: "OF" },
        { name: "J. Wood", pos: "OF" },
        { name: "B. Doyle", pos: "OF" },
        { name: "J. Walker", pos: "OF" },
        { name: "J. Young", pos: "OF" },
        { name: "K. Ruiz", pos: "C" },
        { name: "F. Alvarez", pos: "C" },
        { name: "R. Hoskins", pos: "CM" },
        { name: "CJ. Abrams", pos: "MI" },
        { name: "C. Yelich", pos: "DH" },
      ],
      pitchers: [
        { name: "C. Burnes", pos: "P" },
        { name: "S. Strider", pos: "P" },
        { name: "S. Schwellenbach", pos: "P" },
        { name: "F. Peralta", pos: "P" },
        { name: "Z. Gallen", pos: "P" },
        { name: "M. Gore", pos: "P" },
        { name: "C. Doval", pos: "P" },
        { name: "Ro. Suarez", pos: "P" },
        { name: "R. Helsley", pos: "P" },
      ],
    },
  
    // Demolition Lumber Co.
    {
      teamId: "DemolitionLumberCo",
      teamName: "Demolition Lumber Co.",
      hitters: [
        { name: "M. Busch", pos: "1B" },
        { name: "O. Lopez", pos: "2B" },
        { name: "D. Swanson", pos: "SS" },
        { name: "R. McMahon", pos: "3B" },
        { name: "C. Carroll", pos: "OF" },
        { name: "R. Acuna Jr.", pos: "OF" },
        { name: "K. Tucker", pos: "OF" },
        { name: "T. Edman", pos: "OF" },
        { name: "G. Mitchell", pos: "OF" },
        { name: "P. Bailey", pos: "C" },
        { name: "D. Rushing", pos: "C" },
        { name: "N. Lowe", pos: "CM" },
        { name: "L. Acuna", pos: "MI" },
        { name: "S. Ohtani", pos: "DH" },
      ],
      pitchers: [
        { name: "P. Skenes", pos: "P" },
        { name: "Z. Wheeler", pos: "P" },
        { name: "M. King", pos: "P" },
        { name: "I. Anderson", pos: "P" },
        { name: "E. Rodriguez", pos: "P" },
        { name: "T. Myers", pos: "P" },
        { name: "A.J. Puk", pos: "P" },
        { name: "K. Yates", pos: "P" },
        { name: "R. Pressly", pos: "P" },
      ],
    },
  
    // The Show
    {
      teamId: "TheShow",
      teamName: "The Show",
      hitters: [
        { name: "P. Alonso", pos: "1B" },
        { name: "T. Estrada", pos: "2B" },
        { name: "X. Bogaerts", pos: "SS" },
        { name: "M. Machado", pos: "3B" },
        { name: "M. Harris II", pos: "OF" },
        { name: "P. Crow-Armstrong", pos: "OF" },
        { name: "I. Happ", pos: "OF" },
        { name: "J Profar", pos: "OF" },
        { name: "J. McCarthy", pos: "OF" },
        { name: "Wil. Contreas", pos: "C" },
        { name: "E. Diaz", pos: "C" },
        { name: "B. Harper", pos: "CM" },
        { name: "B. Turang", pos: "MI" },
        { name: "J. Bell", pos: "DH" },
      ],
      pitchers: [
        { name: "B. Snell", pos: "P" },
        { name: "D. Cease", pos: "P" },
        { name: "N. Lodolo", pos: "P" },
        { name: "S. Manea", pos: "P" },
        { name: "J. Taillon", pos: "P" },
        { name: "C. Holmes", pos: "P" },
        { name: "N. Cortes", pos: "P" },
        { name: "K. Finnegan", pos: "P" },
        { name: "R. Iglesias", pos: "P" },
      ],
    },
  
    // Los Doyers
    {
      teamId: "LosDoyers",
      teamName: "Los Doyers",
      hitters: [
        { name: "J. Candelario", pos: "1B" },
        { name: "B. Stott", pos: "2B" },
        { name: "M. Betts", pos: "SS" },
        { name: "M. Muncy", pos: "3B" },
        { name: "T. Hernandez", pos: "OF" },
        { name: "J. Soto", pos: "OF" },
        { name: "J.H. Lee", pos: "OF" },
        { name: "T. Pham", pos: "OF" },
        { name: "A. Burleson", pos: "OF" },
        { name: "W. Smith", pos: "C" },
        { name: "S. Murphy", pos: "C" },
        { name: "M. Shaw", pos: "CM" },
        { name: "M. Winn", pos: "MI" },
        { name: "A. McCutchen", pos: "DH" },
      ],
      pitchers: [
        { name: "S. Alcantara", pos: "P" },
        { name: "K. Senga", pos: "P" },
        { name: "R. Ray", pos: "P" },
        { name: "N. Pivetta", pos: "P" },
        { name: "D. May", pos: "P" },
        { name: "M. Mikolas", pos: "P" },
        { name: "C. Quantrill", pos: "P" },
        { name: "E. Philips", pos: "P" },
        { name: "T. Kinley", pos: "P" },
      ],
    },
  
    // Skunk Dogs
    {
      teamId: "SkunkDogs",
      teamName: "Skunk Dogs",
      hitters: [
        { name: "M. Olson", pos: "1B" },
        { name: "M. McLain", pos: "2B" },
        { name: "T. Turner", pos: "SS" },
        { name: "A. Bohm", pos: "3B" },
        { name: "M. Conforto", pos: "OF" },
        { name: "N,. Castellanos", pos: "OF" },
        { name: "L. Nootbaar", pos: "OF" },
        { name: "L. Gurriel Jr.", pos: "OF" },
        { name: "T. Friedl", pos: "OF" },
        { name: "D. Baldwin", pos: "C" },
        { name: "H. Goodman", pos: "C" },
        { name: "K. Hayes", pos: "CM" },
        { name: "X. Edwards", pos: "MI" },
        { name: "K. Marte", pos: "DH" },
      ],
      pitchers: [
        { name: "C. Sale", pos: "P" },
        { name: "S. Ohtani", pos: "P" },
        { name: "A. Nola", pos: "P" },
        { name: "B. Pfaadt", pos: "P" },
        { name: "C. Sanchez", pos: "P" },
        { name: "J. Luzardo", pos: "P" },
        { name: "D. Bednar", pos: "P" },
        { name: "T. Megill", pos: "P" },
        { name: "A. Diaz", pos: "P" },
      ],
    },
  
    // RGing Sluggers
    {
      teamId: "RGingSluggers",
      teamName: "RGing Sluggers",
      hitters: [
        { name: "F. Freeman", pos: "1B" },
        { name: "L. Garcia", pos: "2B" },
        { name: "O. Cruz", pos: "SS" },
        { name: "M. Chapman", pos: "3B" },
        { name: "B. Donovan", pos: "OF" },
        { name: "S. Steer", pos: "OF" },
        { name: "J. Winker", pos: "OF" },
        { name: "B. Nimmo", pos: "OF" },
        { name: "J. McNeil", pos: "OF" },
        { name: "Wilm. Contreras", pos: "C" },
        { name: "JT Realmuto", pos: "C" },
        { name: "C. Norby", pos: "CM" },
        { name: "E. Tovar", pos: "MI" },
        { name: "K. Schwaber", pos: "DH" },
      ],
      pitchers: [
        { name: "Y. Yamamoto", pos: "P" },
        { name: "L. Webb", pos: "P" },
        { name: "S. Imanaga", pos: "P" },
        { name: "A. Abbott", pos: "P" },
        { name: "B. Singer", pos: "P" },
        { name: "J. Jones", pos: "P" },
        { name: "E. Fedde", pos: "P" },
        { name: "K. Harrison", pos: "P" },
        { name: "C. Faucher", pos: "P" },
      ],
    },
  
    // Diamond Kings
    {
      teamId: "DiamondKings",
      teamName: "Diamond Kings",
      hitters: [
        { name: "J. Naylor", pos: "1B" },
        { name: "J. Cronenworth", pos: "2B" },
        { name: "E. De La Cruz", pos: "SS" },
        { name: "N. Arenado", pos: "3B" },
        { name: "F. Tatis Jr.", pos: "OF" },
        { name: "D. Crews", pos: "OF" },
        { name: "N. Jones", pos: "OF" },
        { name: "S. Frelick", pos: "OF" },
        { name: "J. Sanchez", pos: "OF" },
        { name: "I. Herrera", pos: "C" },
        { name: "T. Stephenson", pos: "C" },
        { name: "J. Bride", pos: "CM" },
        { name: "W. Adames", pos: "MI" },
        { name: "L. Arraez", pos: "DH" },
      ],
      pitchers: [
        { name: "T. Glasnow", pos: "P" },
        { name: "R. Sasaki", pos: "P" },
        { name: "Y. Darvish", pos: "P" },
        { name: "M. Keller", pos: "P" },
        { name: "Ra. Suarez", pos: "P" },
        { name: "J. Verlander", pos: "P" },
        { name: "J. Romano", pos: "P" },
        { name: "E. Diaz", pos: "P" },
        { name: "T. Scott", pos: "P" },
      ],
    },
  
    // Devil Dawgs
    {
      teamId: "DevilDawgs",
      teamName: "Devil Dawgs",
      hitters: [
        { name: "M. Toglia", pos: "1B" },
        { name: "O. Albies", pos: "2B" },
        { name: "T. Fitzgerald", pos: "SS" },
        { name: "A. Riley", pos: "3B" },
        { name: "J. Merrill", pos: "OF" },
        { name: "S. Suzuki", pos: "OF" },
        { name: "B. Reynolds", pos: "OF" },
        { name: "H. Ramos", pos: "OF" },
        { name: "B. Marsh", pos: "OF" },
        { name: "J. Bart", pos: "C" },
        { name: "G. Moreno", pos: "C" },
        { name: "M. Vientos", pos: "CM" },
        { name: "G. Perdomo", pos: "MI" },
        { name: "M. Ozuna", pos: "DH" },
      ],
      pitchers: [
        { name: "J. Steele", pos: "P" },
        { name: "H. Greene", pos: "P" },
        { name: "M. Kelly", pos: "P" },
        { name: "S. Gray", pos: "P" },
        { name: "D. Peterson", pos: "P" },
        { name: "R. Lopez", pos: "P" },
        { name: "G. Holmes", pos: "P" },
        { name: "J. Martinez", pos: "P" },
        { name: "R. Walker", pos: "P" },
      ],
    },
  ];
  
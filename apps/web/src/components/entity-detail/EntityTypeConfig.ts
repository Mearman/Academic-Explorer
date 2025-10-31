/**
 * Configuration for different entity types
 * Defines colors, icons, and display names for each entity type
 */

export interface EntityTypeConfig {
  name: string;
  icon: string;
  colors: {
    gradient: string;
    loading: string;
    badge: string;
    button: string;
  };
}

export const ENTITY_TYPE_CONFIGS: Record<string, EntityTypeConfig> = {
  author: {
    name: "AUTHOR",
    icon: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z",
    colors: {
      gradient: "from-slate-50 via-blue-50 to-indigo-50",
      loading: "from-blue-50 to-indigo-50",
      badge: "bg-blue-100 text-blue-800",
      button: "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
    },
  },
  work: {
    name: "WORK",
    icon: "M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z",
    colors: {
      gradient: "from-slate-50 via-emerald-50 to-teal-50",
      loading: "from-emerald-50 to-teal-50",
      badge: "bg-emerald-100 text-emerald-800",
      button: "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
    },
  },
  institution: {
    name: "INSTITUTION",
    icon: "M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z",
    colors: {
      gradient: "from-slate-50 via-violet-50 to-purple-50",
      loading: "from-violet-50 to-purple-50",
      badge: "bg-violet-100 text-violet-800",
      button: "from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
    },
  },
  source: {
    name: "SOURCE",
    icon: "M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z",
    colors: {
      gradient: "from-slate-50 via-amber-50 to-orange-50",
      loading: "from-amber-50 to-orange-50",
      badge: "bg-amber-100 text-amber-800",
      button: "from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
    },
  },
  concept: {
    name: "CONCEPT",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    colors: {
      gradient: "from-slate-50 via-pink-50 to-rose-50",
      loading: "from-pink-50 to-rose-50",
      badge: "bg-pink-100 text-pink-800",
      button: "from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700",
    },
  },
  funder: {
    name: "FUNDER",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    colors: {
      gradient: "from-slate-50 via-green-50 to-lime-50",
      loading: "from-green-50 to-lime-50",
      badge: "bg-green-100 text-green-800",
      button: "from-green-500 to-lime-600 hover:from-green-600 hover:to-lime-700",
    },
  },
  publisher: {
    name: "PUBLISHER",
    icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
    colors: {
      gradient: "from-slate-50 via-cyan-50 to-sky-50",
      loading: "from-cyan-50 to-sky-50",
      badge: "bg-cyan-100 text-cyan-800",
      button: "from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700",
    },
  },
  topic: {
    name: "TOPIC",
    icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
    colors: {
      gradient: "from-slate-50 via-indigo-50 to-purple-50",
      loading: "from-indigo-50 to-purple-50",
      badge: "bg-indigo-100 text-indigo-800",
      button: "from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700",
    },
  },
};

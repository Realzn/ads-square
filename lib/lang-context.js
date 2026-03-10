'use client';
// lib/lang-context.js — Contexte de langue GLOBAL (partagé par toutes les pages)
// Utilisé par LangProvider (app/LangProvider.jsx) qui wrapping le layout racine.

import { createContext, useContext } from 'react';
import { getT } from './i18n';

export const LangContext       = createContext('fr');
export const LangSetterContext = createContext(() => {});

export function useLang()       { return useContext(LangContext); }
export function useLangSetter() { return useContext(LangSetterContext); }
export function useT()          { const lang = useLang(); return getT(lang); }

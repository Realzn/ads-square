'use client';
/**
 * AdsMostFair · Système i18n complet
 * - Contexte React + Provider
 * - Hook useT() → { t, lang, setLang, ago, fmtDate }
 * - Composant <LanguageSwitcher /> prêt à l'emploi
 * - Persistance localStorage (clé: ads_lang)
 * - Fallback FR si clé manquante dans la langue cible
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Dictionnaires ─────────────────────────────────────────────────────────
const DICT = {

  // ══════════════════════════════════════════════════════════════════════════
  //  FRANÇAIS
  // ══════════════════════════════════════════════════════════════════════════
  fr: {

    // ── Commun ──────────────────────────────────────────────────────────────
    loading: 'Chargement…',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    close: 'Fermer',
    delete: 'Supprimer',
    edit: 'Modifier',
    back: 'Retour',
    copy: 'Copier',
    copied: '✓ Copié !',
    share: 'Partager',
    visit: 'Visiter',
    refresh: '↻ Rafraîchir',
    retry: 'Réessayer',
    send: 'Envoyer',
    validate: 'Valider',
    required: 'requis',
    optional: 'optionnel',
    no_data: 'Pas de données',
    no_results: 'Aucun résultat',
    today: "aujourd'hui",
    results: n => `${n} résultat${n > 1 ? 's' : ''}`,
    ago: (n, unit) => unit === 's' ? `il y a ${n}s` : unit === 'm' ? `il y a ${n}min` : unit === 'h' ? `il y a ${n}h` : `il y a ${n}j`,

    // ── Navigation ──────────────────────────────────────────────────────────
    nav_home: 'Accueil',
    nav_grid: 'Grille',
    nav_dashboard: 'Mon Dashboard',
    nav_leaderboard: 'Classement',
    nav_faq: 'FAQ',
    nav_legal: 'Mentions légales',
    nav_privacy: 'Confidentialité',
    nav_terms: 'CGV',
    nav_language: 'Langue',

    // ── Statuts ─────────────────────────────────────────────────────────────
    status_active: 'ACTIF',
    status_pending: 'EN ATTENTE',
    status_expired: 'EXPIRÉ',
    status_cancelled: 'ANNULÉ',
    status_rejected: 'REJETÉ',
    status_accepted: 'ACCEPTÉ',
    status_suspended: 'SUSPENDU',
    status_inactive: 'INACTIF',

    // ── Tiers ───────────────────────────────────────────────────────────────
    tier_epicenter: 'ÉPICENTRE',
    tier_prestige: 'PRESTIGE',
    tier_elite: 'ÉLITE',
    tier_business: 'BUSINESS',
    tier_standard: 'STANDARD',
    tier_viral: 'VIRAL',

    // ── Rangs ───────────────────────────────────────────────────────────────
    rank_elu: 'ÉLU',
    rank_architecte: 'ARCHITECTE',
    rank_gardien: 'GARDIEN',
    rank_batisseur: 'BÂTISSEUR',
    rank_signal: 'SIGNAL',

    // ══════════════════════════════════════════════════════════════════════
    // ADMIN
    // ══════════════════════════════════════════════════════════════════════
    admin_title: 'DYSON·COSMOS',
    admin_subtitle: 'ADMINISTRATION·MK·VII',
    admin_pwd_placeholder: 'MOT DE PASSE ADMIN',
    admin_login_btn: 'ACCÉDER →',
    admin_logging_in: 'VÉRIFICATION…',
    admin_err_wrong_pwd: 'Mot de passe incorrect.',
    admin_err_server: 'Erreur serveur — vérifiez que ADMIN_SECRET est défini dans Cloudflare Pages',
    admin_err_connect: 'Erreur de connexion au serveur.',
    admin_logout: 'DÉCONNEXION',
    admin_see_site: '↗ VOIR·LE·SITE',
    admin_refresh: '↻ RAFRAÎCHIR',

    // Sidebar tabs
    tab_overview: "Vue d'ensemble",
    tab_bookings: 'Réservations',
    tab_users: 'Utilisateurs',
    tab_offers: 'Offres',
    tab_revenue: 'Revenus',
    tab_analytics: 'Analytics',
    tab_config: 'Configuration',

    // Vue d'ensemble
    ov_revenue: '💰 Revenus',
    ov_kpi_total: 'Revenu Total',
    ov_kpi_month: 'Ce mois',
    ov_kpi_mrr: 'MRR',
    ov_kpi_avg: 'Panier moyen',
    ov_chart_30d: 'REVENUS — 30 DERNIERS JOURS',
    ov_platform: '📊 Plateforme',
    ov_kpi_active: 'Blocs Actifs',
    ov_kpi_pending: 'En attente',
    ov_kpi_users: 'Utilisateurs',
    ov_kpi_offers: 'Offres en att',
    ov_occupation: pct => `${pct}% d'occupation`,
    ov_active_users: n => `${n} actifs`,
    ov_chart_occupation: 'OCCUPATION PAR TIER',
    ov_chart_engagement: 'ENGAGEMENT',
    ov_clicks_total: 'Clics totaux',
    ov_impressions: 'Impressions',
    ov_ctr_avg: 'CTR moyen',
    ov_bookings_total: 'Bookings total',
    ov_chart_today: "aujourd'hui",
    ov_chart_30j: '-30j',

    // Waitlist
    wl_section: '📧 Waitlist & Lancement',
    wl_registered: 'INSCRITS',
    wl_brands: 'MARQUES',
    wl_creators: 'CRÉATEURS',
    wl_freelancers: 'FREELANCES',
    wl_launch_btn: "🚀 ENVOYER L'EMAIL DE LANCEMENT",
    wl_confirm_title: "⚠ CONFIRMER L'ENVOI",
    wl_confirm_desc: n => `Cela enverra un email à ${n} personnes pour annoncer l'ouverture de la plateforme.`,
    wl_cancel: 'Annuler',
    wl_confirm_btn: '✓ CONFIRMER',
    wl_sending: 'Envoi en cours…',
    wl_done_title: '✓ ENVOI TERMINÉ',
    wl_done_sent: n => `✓ ${n} envoyés`,
    wl_done_errors: n => `✗ ${n} erreurs`,
    wl_error: "Erreur lors de l'envoi",
    wl_retry: 'Réessayer',
    wl_bilingual: 'Email bilingue FR/EN · via Resend',

    // Réservations
    bk_search: '🔍 Nom, email…',
    bk_all: 'Tous',
    bk_active: 'Actifs',
    bk_pending: 'En attente',
    bk_expired: 'Expirés',
    bk_cancelled: 'Annulés',
    bk_tiers: 'Tiers',
    bk_col_slot: 'Slot',
    bk_col_advertiser: 'Annonceur',
    bk_col_tier: 'Tier',
    bk_col_status: 'Statut',
    bk_col_period: 'Période',
    bk_col_amount: 'Montant',
    bk_col_clicks: 'Clics',
    bk_col_offers: 'Offres',
    bk_col_actions: 'Actions',
    bk_clicks: 'clics',
    bk_results: n => `${n} résultats`,
    bk_loading: 'Chargement…',
    bk_empty: 'Aucun résultat',
    bk_days_left: n => `J-${n}`,
    bk_modal_cancel_title: name => `Annuler — ${name}`,
    bk_modal_cancel_desc: 'Le slot sera libéré immédiatement.',
    bk_modal_cancel_reason: 'Raison (optionnel)',
    bk_modal_cancel_confirm: "Confirmer l'annulation",
    bk_modal_extend_title: name => `Prolonger — ${name}`,
    bk_modal_extend_end: date => `Fin actuelle : ${date}`,
    bk_modal_extend_confirm: n => `Prolonger de ${n} jours`,
    bk_modal_activate_title: name => `Forcer activation — ${name}`,
    bk_modal_activate_desc: 'Passer de En attente → Actif sans paiement Stripe.',
    bk_modal_activate_confirm: 'Forcer actif',
    bk_action_done: 'Action effectuée ✓',
    bk_offers_badge: n => `${n} offre${n > 1 ? 's' : ''}`,

    // Utilisateurs
    usr_search: '🔍 Email, nom…',
    usr_all: 'Tous',
    usr_active: 'Actifs',
    usr_suspended: 'Suspendus',
    usr_col_user: 'Utilisateur',
    usr_col_type: 'Type',
    usr_col_bookings: 'Bookings',
    usr_col_ltv: 'LTV',
    usr_col_activity: 'Dernière activité',
    usr_col_status: 'Statut',
    usr_active_bk: n => `${n} actifs`,
    usr_total_bk: n => `${n} total`,
    usr_count: n => `${n} utilisateurs`,
    usr_note_label: 'NOTE ADMIN',
    usr_note_placeholder: 'Ajouter une note interne…',
    usr_save_note: 'Enregistrer la note',
    usr_suspend: '⊗ Suspendre le compte',
    usr_unsuspend: '✓ Réactiver le compte',
    usr_updated: 'Utilisateur mis à jour ✓',
    usr_since: date => `Membre depuis ${date}`,
    usr_stripe: 'Stripe Customer',
    usr_expired_bk: n => `${n} expirés`,

    // Offres
    of_pending: n => `⏳ En attente (${n})`,
    of_history: '📋 Historique',
    of_empty_pending: 'Aucune offre en attente',
    of_accept: '✓ Accepter',
    of_reject: '✕ Rejeter',
    of_by: 'par',
    of_slot: 'Slot',
    of_occupant: 'Occupant',
    of_email: 'Email',
    of_expires: 'Expire dans',
    of_hours: 'h',
    of_toast_accepted: 'Offre acceptée ✓',
    of_toast_rejected: 'Offre rejetée ✓',

    // Revenus
    rev_monthly: 'REVENU PAR MOIS',
    rev_by_tier: 'REVENU PAR TIER',
    rev_top_clients: 'TOP 10 CLIENTS',
    rev_bookings: n => `${n} booking${n > 1 ? 's' : ''}`,

    // Analytics
    an_clicks_14d: 'CLICS — 14 DERNIERS JOURS',
    an_top_slots: 'TOP 20 SLOTS PAR CTR',
    an_top_sources: 'TOP SOURCES (30j)',
    an_no_slots: 'Pas de données',
    an_no_referrer: 'Pas encore de données referrer',
    an_clicks_unit: n => `${n} clics`,

    // Config
    cfg_tiers_title: 'Ouverture progressive des tiers',
    cfg_tiers_sub: 'Contrôle en temps réel — sans redéploiement',
    cfg_open: n => `${n} ouvert${n > 1 ? 's' : ''}`,
    cfg_closed: n => `${n} fermé${n > 1 ? 's' : ''}`,
    cfg_tier_open: '🟢 OUVERT',
    cfg_tier_closed: '🔒 PROCHAINEMENT',
    cfg_tier_updating: '⏳ Mise à jour…',
    cfg_modified_by: (who, when) => `Modifié par ${who} · ${when}`,
    cfg_blocks: n => `${n} bloc${n > 1 ? 's' : ''}`,
    cfg_toast_opened: label => `Tier ${label} 🟢 ouvert ✓`,
    cfg_toast_closed: label => `Tier ${label} 🔒 fermé ✓`,
    cfg_effect_note: "⚡ Ces changements prennent effet immédiatement. L'API checkout vérifie",
    cfg_slots_title: 'Blocs désactivés individuellement',
    cfg_slots_sub: 'Désactiver un slot précis sans fermer tout son tier',
    cfg_col_x: 'COLONNE X',
    cfg_col_y: 'LIGNE Y',
    cfg_reason: 'RAISON (optionnel)',
    cfg_reason_ph: 'Maintenance, réservé, etc.',
    cfg_disable_btn: '⊗ Désactiver',
    cfg_invalid_coords: 'Coordonnées invalides (1–36)',
    cfg_disabled_badge: n => `${n} bloc${n > 1 ? 's' : ''} désactivé${n > 1 ? 's' : ''}`,
    cfg_none_disabled: 'Aucun bloc désactivé individuellement',
    cfg_disabled_by: (when, who) => `Désactivé ${when}${who ? ` par ${who}` : ''}`,
    cfg_reactivate: '✓ Réactiver',
    cfg_slot_disabled_toast: (x, y) => `Bloc (${x},${y}) désactivé ✓`,
    cfg_slot_enabled_toast: (x, y) => `Bloc (${x},${y}) réactivé ✓`,
    cfg_audit_title: "JOURNAL D'AUDIT — 100 DERNIÈRES ACTIONS",
    cfg_audit_empty: 'Aucune action enregistrée',

    // ══════════════════════════════════════════════════════════════════════
    // DASHBOARD ANNONCEUR
    // ══════════════════════════════════════════════════════════════════════
    dash_title: 'Mon Dashboard',
    dash_login_title: 'Connexion',
    dash_login_sub: 'Connectez-vous pour accéder à vos stats, tâches et offres.',
    dash_email_ph: 'votre@email.com',
    dash_send_code: 'RECEVOIR MON CODE →',
    dash_sending: 'ENVOI…',
    dash_code_sent: email => `Code envoyé à ${email}`,
    dash_code_ph: '000000',
    dash_connect: 'SE CONNECTER →',
    dash_connecting: 'VÉRIFICATION…',
    dash_change_email: "← Changer d'email",
    dash_invalid_token: 'Token invalide ou expiré',
    dash_logout: 'Déconnexion',
    dash_suspension_warning: n => `Votre slot sera suspendu dans ${n} jour${n > 1 ? 's' : ''} — complétez vos tâches aujourd'hui.`,
    dash_suspension_imminent: '⚠️ Suspension imminente',
    dash_tab_stats: '📊 Stats',
    dash_tab_tasks: '✦ Tâches',
    dash_tab_feed: '🌐 Fil',
    dash_tab_offers: '💰 Offres',
    dash_streak: 'STREAK',
    dash_slot_section: 'MON SLOT',
    dash_view_page: 'VOIR MA PAGE →',
    dash_clicks_7d: 'CLICS 7 JOURS',
    dash_ctr: 'CTR MOYEN',
    dash_coming_soon: 'à venir',
    dash_connect_slot: 'connectez votre slot',
    dash_clicks_today: "CLICS AUJOURD'HUI",
    dash_clicks_month: 'CLICS CE MOIS',
    dash_chart_title: 'CLICS — 7 DERNIERS JOURS',
    dash_chart_days: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    dash_feed_title: 'Fil communautaire',
    dash_feed_sub: 'Les actions des membres de la Sphère de Dyson.',
    dash_feed_empty: "Le fil communautaire est vide pour l'instant.",
    dash_feed_empty_sub: 'Complétez vos tâches pour y apparaître !',
    dash_feed_proof: '↗ Voir la preuve',
    dash_offers_title: 'Offres de rachat',
    dash_offers_sub: "Quelqu'un veut votre slot ? Acceptez ou refusez ici.",
    dash_offers_empty: 'Aucune offre en attente.',
    dash_offers_empty_sub: "Les offres de rachat apparaîtront ici dès qu'un acheteur cible votre slot.",

    // ══════════════════════════════════════════════════════════════════════
    // TÂCHES
    // ══════════════════════════════════════════════════════════════════════
    tasks_title: 'Tâches du jour',
    tasks_all_done: '✓ Toutes les tâches sont complétées !',
    tasks_progress: (done, total) => `${done}/${total} complétées`,
    tasks_streak: n => `🔥 ${n} jours de streak`,
    tasks_no_tasks: "Aucune tâche pour aujourd'hui.",
    tasks_no_tasks_sub: 'Les tâches sont générées chaque matin pour les abonnés actifs.',
    tasks_validate_btn: 'VALIDER LA TÂCHE ✓',
    tasks_validating: 'VALIDATION…',
    tasks_proof_text_ph: "Décrivez l'action réalisée (requis)",
    tasks_proof_url_ph: 'Lien de preuve (optionnel)',
    tasks_proof_platform_ph: 'Plateforme (optionnel)',
    tasks_platforms: ['Instagram', 'Twitter/X', 'LinkedIn', 'TikTok', 'YouTube', 'Autre'],
    tasks_done: '✓ FAIT',
    tasks_top_streaks: '🏆 Top Streaks de la Grille',
    tasks_consecutive: 'jours consécutifs',
    task_share_grid_label: 'Partager la grille',
    task_share_grid_desc: 'Partagez AdsMostFair sur vos réseaux.',
    task_highlight_label: 'Mettre en avant un voisin',
    task_highlight_desc: 'Mentionnez un créateur voisin sur vos réseaux.',
    task_content_label: 'Créer du contenu',
    task_content_desc: 'Publiez du contenu autour de la grille.',
    task_welcome_label: 'Accueillir un nouveau',
    task_welcome_desc: 'Accueillez un nouveau membre publiquement.',
    task_recommend_label: 'Recommander 2 membres',
    task_recommend_desc: 'Recommandez publiquement 2 membres.',
    task_advantage_label: 'Offrir un avantage',
    task_advantage_desc: 'Offrez un avantage exclusif aux membres.',
    task_perfect_label: 'Slot parfait',
    task_perfect_desc: 'Votre slot est à jour — rien à faire !',
    task_icon_share: '📡',
    task_icon_highlight: '✨',
    task_icon_content: '🎨',
    task_icon_welcome: '👋',
    task_icon_recommend: '🤝',
    task_icon_advantage: '🎁',
    task_icon_perfect: '💎',

    // ══════════════════════════════════════════════════════════════════════
    // PAGE SLOT PUBLIQUE
    // ══════════════════════════════════════════════════════════════════════
    slot_available_title: (x, y) => `Slot [${x},${y}] disponible`,
    slot_available_desc: (tier, price) => `Ce slot ${tier} est libre. Réservez-le dès ${price} et exposez votre marque à toute la grille.`,
    slot_book_btn: 'RÉSERVER CE SLOT →',
    slot_position: 'Position',
    slot_tier: 'Tier',
    slot_rate: 'Tarif',
    slot_active_until: date => `ACTIF jusqu'au ${date}`,
    slot_share_title: 'PARTAGER CE SLOT',
    slot_tweet: '𝕏 PARTAGER',
    slot_copy_link: '⎘ COPIER LE LIEN',
    slot_neighbors: 'VOISINS SUR LA GRILLE',
    slot_history: 'HISTORIQUE DE CE SLOT',
    slot_cta_title: 'La grille publicitaire ouverte à tous',
    slot_cta_sub: '1 369 slots disponibles · de 1€ à 1 000€/jour',
    slot_explore: 'EXPLORER LA GRILLE →',
    slot_stat_clicks: 'CLICS TOTAUX',
    slot_stat_impressions: 'IMPRESSIONS',
    slot_stat_ctr: 'CTR',
    slot_share_occupied: (name, tier, x, y) => `Découvrez ${name} sur AdsMostFair — slot ${tier} [${x},${y}]`,
    slot_share_free: (tier, x, y, price) => `Slot ${tier} [${x},${y}] disponible sur AdsMostFair dès ${price}`,
    slot_grid_link: 'Grille',
    slot_day: 'j',
    slot_no_neighbors: 'Aucun voisin actif',
    slot_empty_history: 'Aucun historique',

    // ══════════════════════════════════════════════════════════════════════
    // LEADERBOARD
    // ══════════════════════════════════════════════════════════════════════
    lb_title: 'Classement',
    lb_sub: 'Les meilleures performances de la grille.',
    lb_cat_clicks: '📡 Clics',
    lb_cat_clicks_desc: 'Slots les plus cliqués',
    lb_cat_streaks: '🔥 Streaks',
    lb_cat_streaks_desc: 'Meilleurs streaks de tâches',
    lb_cat_revenue: '💰 Investissement',
    lb_cat_revenue_desc: 'Plus gros investisseurs',
    lb_period_7d: '7 jours',
    lb_period_30d: '30 jours',
    lb_period_all: 'Tout temps',
    lb_stat_clicks: 'CLICS TOTAUX',
    lb_stat_slots: 'SLOTS OCCUPÉS',
    lb_stat_occ: 'TAUX OCCUPATION',
    lb_col_advertiser: 'ANNONCEUR',
    lb_empty: 'Aucune donnée pour cette période.',
    lb_empty_sub: 'Réservez un slot et revenez ici !',
    lb_cta: 'Votre nom pourrait être ici.',
    lb_cta_btn: 'RÉSERVER MON SLOT →',
    lb_clicks_unit: 'clics',
    lb_days_unit: 'jours consécutifs',
    lb_invested_unit: 'investis',

    // ══════════════════════════════════════════════════════════════════════
    // CHAT
    // ══════════════════════════════════════════════════════════════════════
    chat_title: 'Chat',
    chat_ch_general: 'Général',
    chat_ch_annonces: 'Annonces',
    chat_ch_createurs: 'Créateurs',
    chat_ch_collab: 'Collab',
    chat_ch_music: 'Music',
    chat_ch_vitrines: 'Vitrines',
    chat_ch_offtopic: 'Off-topic',
    chat_placeholder: 'Votre message…',
    chat_pseudo_ph: 'Votre pseudo',
    chat_send: 'Envoyer',
    chat_read_only: 'Canal en lecture seule',
    chat_login_req: 'Connectez-vous pour participer',
    chat_empty: 'Aucun message dans ce canal.',
    chat_load_more: 'Charger plus',
    chat_delete_confirm: 'Supprimer ce message ?',
    chat_deleted: 'Message supprimé',
    chat_too_long: max => `Message trop long (max ${max} caractères)`,

    // ══════════════════════════════════════════════════════════════════════
    // SIDEBAR / GRILLE
    // ══════════════════════════════════════════════════════════════════════
    grid_title: 'Grille',
    grid_slot_detail: 'Détail du slot',
    grid_occupied: 'Occupé',
    grid_free: 'Disponible',
    grid_book: 'Réserver ce slot',
    grid_offer: 'Faire une offre',
    grid_pub_page: 'Page publique →',
    grid_position: 'Position',
    grid_tier: 'Tier',
    grid_rate: 'Tarif',
    grid_status: 'Statut',
    grid_ends: 'Fin',
    grid_active_since: 'Actif depuis',
    grid_days_left: n => `J-${n}`,
    grid_zoom_in: 'Zoom +',
    grid_zoom_out: 'Zoom −',
    grid_reset: 'Réinitialiser',
    grid_filters: 'Filtres',
    grid_search_ph: 'Chercher un slot…',
    grid_empty: 'Cliquez sur un slot pour voir les détails.',
    grid_legend: 'Légende',

    // ══════════════════════════════════════════════════════════════════════
    // MODALS
    // ══════════════════════════════════════════════════════════════════════
    modal_book_title: 'Réserver ce slot',
    modal_book_name: 'Votre nom / marque',
    modal_book_slogan: 'Slogan (optionnel)',
    modal_book_url: 'URL de destination',
    modal_book_email: 'Email',
    modal_book_start: 'Date de début',
    modal_book_end: 'Date de fin',
    modal_book_duration: 'Durée',
    modal_book_total: 'Total',
    modal_book_per_day: '/jour',
    modal_book_days: n => `${n} jour${n > 1 ? 's' : ''}`,
    modal_book_proceed: 'PROCÉDER AU PAIEMENT →',
    modal_book_unavailable: "Ce slot n'est pas disponible pour cette période.",

    modal_offer_title: 'Faire une offre de rachat',
    modal_offer_amount: 'Votre offre (€)',
    modal_offer_name: 'Votre nom',
    modal_offer_email: 'Votre email',
    modal_offer_msg: "Message à l'occupant (optionnel)",
    modal_offer_min: min => `Offre minimum : ${min}€`,
    modal_offer_expires: 'Expire dans 72h',
    modal_offer_btn: "SOUMETTRE L'OFFRE →",
    modal_offer_success: "Offre envoyée ! L'occupant a 72h pour répondre.",

    modal_bug_title: 'Signaler un bug',
    modal_bug_desc: 'Description du problème',
    modal_bug_email: 'Votre email (optionnel)',
    modal_bug_btn: 'ENVOYER LE RAPPORT →',
    modal_bug_success: 'Rapport envoyé, merci !',

    modal_slot_visit: 'VISITER →',
    modal_slot_active: 'ACTIF',
    modal_slot_free: 'DISPONIBLE',
    modal_slot_offer_btn: 'Faire une offre',
    modal_slot_book_btn: 'Réserver',
    modal_slot_clicks: 'clics',
    modal_slot_impressions: 'impressions',

    // ══════════════════════════════════════════════════════════════════════
    // WAITLIST (page home)
    // ══════════════════════════════════════════════════════════════════════
    wl_join_title: 'Rejoindre la Waitlist',
    wl_join_sub: 'Soyez parmi les premiers à accéder à AdsMostFair.',
    wl_email_ph: 'votre@email.com',
    wl_profile_ph: 'Votre profil',
    wl_profile_creator: 'Créateur',
    wl_profile_freelance: 'Freelance',
    wl_profile_brand: 'Marque',
    wl_join_btn: 'REJOINDRE →',
    wl_join_success: "Vous êtes sur la liste ! On vous contacte à l'ouverture.",
    wl_already: 'Vous êtes déjà inscrit.',

    // ══════════════════════════════════════════════════════════════════════
    // FAQ
    // ══════════════════════════════════════════════════════════════════════
    faq_title: 'Questions fréquentes',
    faq_sub: 'Tout ce que vous devez savoir sur AdsMostFair.',
    faq_questions: [
      { q: "C'est quoi AdsMostFair ?", a: "AdsMostFair est une grille publicitaire numérique de 37×37 blocs (1 369 emplacements). Chaque bloc peut être réservé à la journée par un créateur, freelance ou marque pour afficher son contenu." },
      { q: "Comment fonctionne la tarification ?", a: "Le prix dépend de la position du bloc (son « tier »). Centre (Épicentre) : 1 000€/jour. Bords (Viral) : 1€/jour. Entre les deux : Prestige 100€/j, Élite 50€/j, Business 10€/j, Standard 3€/j." },
      { q: "Comment réserver un bloc ?", a: "Cliquez sur un bloc disponible, choisissez vos dates, personnalisez votre contenu (couleurs, texte, logo) et payez via Stripe. Votre bloc est visible en quelques minutes." },
      { q: "Puis-je annuler ma réservation ?", a: "Les réservations ne sont pas remboursables une fois le paiement effectué. Contactez le support pour des cas exceptionnels." },
      { q: "Qu'est-ce que la Sphère de Dyson ?", a: "Notre système de gamification. En souscrivant un abonnement journalier, vous obtenez un rang (Signal → Élu) et devez compléter des tâches quotidiennes pour maintenir votre slot visible." },
      { q: "Comment fonctionnent les offres de rachat ?", a: "Si un bloc convoité est occupé, faites une offre de rachat. L'occupant a 72h pour accepter ou refuser. Si accepté, votre paiement est déclenché et le slot vous est transféré." },
      { q: "Mes statistiques sont-elles publiques ?", a: "Le classement par clics est public. Vos stats détaillées (impressions, CTR) ne sont visibles que dans votre dashboard." },
      { q: "Quels formats de contenu sont acceptés ?", a: "Texte, image, vidéo (lien) ou contenu brand. Vous définissez couleurs, texte, logo et URL de destination. Contenu soumis à modération." },
    ],

    // ══════════════════════════════════════════════════════════════════════
    // MENTIONS LÉGALES
    // ══════════════════════════════════════════════════════════════════════
    legal_title: 'Mentions légales',
    legal_sub: 'Informations légales relatives à AdsMostFair.',
    legal_editor_title: 'Éditeur du site',
    legal_editor: 'AdsMostFair est une société en cours de création. Pour toute question : contact@adsmostfair.com',
    legal_hosting_title: 'Hébergement',
    legal_hosting: 'Le site est hébergé par Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, États-Unis.',
    legal_director_title: 'Directeur de la publication',
    legal_director: 'Le fondateur de la société AdsMostFair (société en cours de création).',
    legal_ip_title: 'Propriété intellectuelle',
    legal_ip: "L'ensemble des contenus présents sur AdsMostFair (textes, images, code, design) sont la propriété exclusive d'AdsMostFair ou de leurs auteurs respectifs, protégés par le droit de la propriété intellectuelle.",
    legal_liability_title: 'Limitation de responsabilité',
    legal_liability: "AdsMostFair ne saurait être tenu responsable du contenu publié par les annonceurs. Tout contenu inapproprié peut être signalé via le formulaire de bug report.",
    legal_contact_title: 'Contact',
    legal_contact: 'Pour toute question : contact@adsmostfair.com',

    // ══════════════════════════════════════════════════════════════════════
    // CGV
    // ══════════════════════════════════════════════════════════════════════
    cgv_title: 'Conditions Générales de Vente',
    cgv_sub: "Conditions applicables à l'utilisation d'AdsMostFair.",
    cgv_updated: 'Dernière mise à jour',
    cgv_s1_title: 'Objet',
    cgv_s1: "Les présentes CGV régissent les conditions dans lesquelles AdsMostFair fournit des services de réservation d'espaces publicitaires numériques sur une grille interactive.",
    cgv_s2_title: 'Description des services',
    cgv_s2: "AdsMostFair propose la location de blocs publicitaires sur une grille de 37×37. Chaque bloc est loué à la journée selon un tarif déterminé par sa position (tier).",
    cgv_s3_title: 'Tarifs et paiement',
    cgv_s3: "Les tarifs sont affichés en euros TTC. Le paiement s'effectue via Stripe. Toute réservation validée donne lieu à une facturation immédiate. Les prix peuvent être modifiés sans préavis.",
    cgv_s4_title: 'Annulation et remboursement',
    cgv_s4: "Les réservations ne sont pas remboursables une fois confirmées. En cas de dysfonctionnement imputable à AdsMostFair, une solution de remplacement ou un remboursement partiel pourra être proposé.",
    cgv_s5_title: 'Contenu des annonces',
    cgv_s5: "L'annonceur est seul responsable du contenu publié. Est interdit : contenu illégal, trompeur, diffamatoire, pornographique ou portant atteinte aux droits de tiers. AdsMostFair peut supprimer tout contenu non conforme sans remboursement.",
    cgv_s6_title: 'Données personnelles',
    cgv_s6: "La collecte et le traitement des données personnelles sont régis par notre Politique de Confidentialité.",
    cgv_s7_title: 'Droit applicable',
    cgv_s7: "Les présentes CGV sont soumises au droit français. En cas de litige, les tribunaux compétents de [Ville] seront seuls compétents.",

    // ══════════════════════════════════════════════════════════════════════
    // CONFIDENTIALITÉ
    // ══════════════════════════════════════════════════════════════════════
    priv_title: 'Politique de Confidentialité',
    priv_sub: 'Comment nous collectons et utilisons vos données.',
    priv_updated: 'Dernière mise à jour',
    priv_s1_title: 'Introduction',
    priv_s1: "AdsMostFair s'engage à protéger votre vie privée. Cette politique explique quelles données nous collectons, comment nous les utilisons, et vos droits.",
    priv_s2_title: 'Données collectées',
    priv_s2: "Nous collectons : votre adresse email (connexion et notifications), vos contenus publicitaires (nom, slogan, couleurs, URL), vos données de paiement (traitées par Stripe, non stockées chez nous), et des données anonymisées de navigation (clics, impressions, référents).",
    priv_s3_title: 'Utilisation des données',
    priv_s3: "Vos données sont utilisées pour : gérer votre compte et vos réservations, afficher vos annonces, vous envoyer des notifications transactionnelles, améliorer la plateforme via des statistiques anonymisées.",
    priv_s4_title: 'Conservation des données',
    priv_s4: "Vos données sont conservées pendant toute la durée de votre relation avec AdsMostFair, puis 3 ans après votre dernière activité. Les données de paiement ne sont pas stockées sur nos serveurs.",
    priv_s5_title: 'Vos droits (RGPD)',
    priv_s5: "Vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition. Exercez vos droits à : privacy@adsmostfair.com",
    priv_s6_title: 'Cookies',
    priv_s6: "AdsMostFair utilise uniquement des cookies strictement nécessaires (session, préférences de langue). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.",
    priv_s7_title: 'Contact DPO',
    priv_s7: 'Pour toute question relative à vos données : privacy@adsmostfair.com',
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ENGLISH
  // ══════════════════════════════════════════════════════════════════════════
  en: {

    // ── Common ──────────────────────────────────────────────────────────────
    loading: 'Loading…',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    copy: 'Copy',
    copied: '✓ Copied!',
    share: 'Share',
    visit: 'Visit',
    refresh: '↻ Refresh',
    retry: 'Retry',
    send: 'Send',
    validate: 'Validate',
    required: 'required',
    optional: 'optional',
    no_data: 'No data',
    no_results: 'No results',
    today: 'today',
    results: n => `${n} result${n > 1 ? 's' : ''}`,
    ago: (n, unit) => unit === 's' ? `${n}s ago` : unit === 'm' ? `${n}min ago` : unit === 'h' ? `${n}h ago` : `${n}d ago`,

    // ── Navigation ──────────────────────────────────────────────────────────
    nav_home: 'Home',
    nav_grid: 'Grid',
    nav_dashboard: 'My Dashboard',
    nav_leaderboard: 'Leaderboard',
    nav_faq: 'FAQ',
    nav_legal: 'Legal Notice',
    nav_privacy: 'Privacy Policy',
    nav_terms: 'Terms of Sale',
    nav_language: 'Language',

    // ── Statuses ─────────────────────────────────────────────────────────────
    status_active: 'ACTIVE',
    status_pending: 'PENDING',
    status_expired: 'EXPIRED',
    status_cancelled: 'CANCELLED',
    status_rejected: 'REJECTED',
    status_accepted: 'ACCEPTED',
    status_suspended: 'SUSPENDED',
    status_inactive: 'INACTIVE',

    // ── Tiers ───────────────────────────────────────────────────────────────
    tier_epicenter: 'EPICENTER',
    tier_prestige: 'PRESTIGE',
    tier_elite: 'ELITE',
    tier_business: 'BUSINESS',
    tier_standard: 'STANDARD',
    tier_viral: 'VIRAL',

    // ── Ranks ───────────────────────────────────────────────────────────────
    rank_elu: 'CHOSEN',
    rank_architecte: 'ARCHITECT',
    rank_gardien: 'GUARDIAN',
    rank_batisseur: 'BUILDER',
    rank_signal: 'SIGNAL',

    // ══════════════════════════════════════════════════════════════════════
    // ADMIN
    // ══════════════════════════════════════════════════════════════════════
    admin_title: 'DYSON·COSMOS',
    admin_subtitle: 'ADMINISTRATION·MK·VII',
    admin_pwd_placeholder: 'ADMIN PASSWORD',
    admin_login_btn: 'ACCESS →',
    admin_logging_in: 'VERIFYING…',
    admin_err_wrong_pwd: 'Incorrect password.',
    admin_err_server: 'Server error — check that ADMIN_SECRET is set in Cloudflare Pages',
    admin_err_connect: 'Server connection error.',
    admin_logout: 'SIGN OUT',
    admin_see_site: '↗ VIEW·SITE',
    admin_refresh: '↻ REFRESH',

    // Sidebar tabs
    tab_overview: 'Overview',
    tab_bookings: 'Bookings',
    tab_users: 'Users',
    tab_offers: 'Offers',
    tab_revenue: 'Revenue',
    tab_analytics: 'Analytics',
    tab_config: 'Configuration',

    // Overview
    ov_revenue: '💰 Revenue',
    ov_kpi_total: 'Total Revenue',
    ov_kpi_month: 'This month',
    ov_kpi_mrr: 'MRR',
    ov_kpi_avg: 'Avg. cart',
    ov_chart_30d: 'REVENUE — LAST 30 DAYS',
    ov_platform: '📊 Platform',
    ov_kpi_active: 'Active Blocks',
    ov_kpi_pending: 'Pending',
    ov_kpi_users: 'Users',
    ov_kpi_offers: 'Pending offers',
    ov_occupation: pct => `${pct}% occupancy`,
    ov_active_users: n => `${n} active`,
    ov_chart_occupation: 'OCCUPANCY BY TIER',
    ov_chart_engagement: 'ENGAGEMENT',
    ov_clicks_total: 'Total clicks',
    ov_impressions: 'Impressions',
    ov_ctr_avg: 'Avg. CTR',
    ov_bookings_total: 'Total bookings',
    ov_chart_today: 'today',
    ov_chart_30j: '-30d',

    // Waitlist
    wl_section: '📧 Waitlist & Launch',
    wl_registered: 'REGISTERED',
    wl_brands: 'BRANDS',
    wl_creators: 'CREATORS',
    wl_freelancers: 'FREELANCERS',
    wl_launch_btn: '🚀 SEND LAUNCH EMAIL',
    wl_confirm_title: '⚠ CONFIRM SEND',
    wl_confirm_desc: n => `This will send an email to ${n} people to announce the platform launch.`,
    wl_cancel: 'Cancel',
    wl_confirm_btn: '✓ CONFIRM',
    wl_sending: 'Sending…',
    wl_done_title: '✓ SEND COMPLETE',
    wl_done_sent: n => `✓ ${n} sent`,
    wl_done_errors: n => `✗ ${n} errors`,
    wl_error: 'Error while sending',
    wl_retry: 'Retry',
    wl_bilingual: 'Bilingual FR/EN email · via Resend',

    // Bookings
    bk_search: '🔍 Name, email…',
    bk_all: 'All',
    bk_active: 'Active',
    bk_pending: 'Pending',
    bk_expired: 'Expired',
    bk_cancelled: 'Cancelled',
    bk_tiers: 'Tiers',
    bk_col_slot: 'Slot',
    bk_col_advertiser: 'Advertiser',
    bk_col_tier: 'Tier',
    bk_col_status: 'Status',
    bk_col_period: 'Period',
    bk_col_amount: 'Amount',
    bk_col_clicks: 'Clicks',
    bk_col_offers: 'Offers',
    bk_col_actions: 'Actions',
    bk_clicks: 'clicks',
    bk_results: n => `${n} results`,
    bk_loading: 'Loading…',
    bk_empty: 'No results',
    bk_days_left: n => `D-${n}`,
    bk_modal_cancel_title: name => `Cancel — ${name}`,
    bk_modal_cancel_desc: 'The slot will be freed immediately.',
    bk_modal_cancel_reason: 'Reason (optional)',
    bk_modal_cancel_confirm: 'Confirm cancellation',
    bk_modal_extend_title: name => `Extend — ${name}`,
    bk_modal_extend_end: date => `Current end date: ${date}`,
    bk_modal_extend_confirm: n => `Extend by ${n} days`,
    bk_modal_activate_title: name => `Force activation — ${name}`,
    bk_modal_activate_desc: 'Change from Pending → Active without Stripe payment.',
    bk_modal_activate_confirm: 'Force active',
    bk_action_done: 'Action completed ✓',
    bk_offers_badge: n => `${n} offer${n > 1 ? 's' : ''}`,

    // Users
    usr_search: '🔍 Email, name…',
    usr_all: 'All',
    usr_active: 'Active',
    usr_suspended: 'Suspended',
    usr_col_user: 'User',
    usr_col_type: 'Type',
    usr_col_bookings: 'Bookings',
    usr_col_ltv: 'LTV',
    usr_col_activity: 'Last activity',
    usr_col_status: 'Status',
    usr_active_bk: n => `${n} active`,
    usr_total_bk: n => `${n} total`,
    usr_count: n => `${n} users`,
    usr_note_label: 'ADMIN NOTE',
    usr_note_placeholder: 'Add an internal note…',
    usr_save_note: 'Save note',
    usr_suspend: '⊗ Suspend account',
    usr_unsuspend: '✓ Reactivate account',
    usr_updated: 'User updated ✓',
    usr_since: date => `Member since ${date}`,
    usr_stripe: 'Stripe Customer',
    usr_expired_bk: n => `${n} expired`,

    // Offers
    of_pending: n => `⏳ Pending (${n})`,
    of_history: '📋 History',
    of_empty_pending: 'No pending offers',
    of_accept: '✓ Accept',
    of_reject: '✕ Reject',
    of_by: 'by',
    of_slot: 'Slot',
    of_occupant: 'Occupant',
    of_email: 'Email',
    of_expires: 'Expires in',
    of_hours: 'h',
    of_toast_accepted: 'Offer accepted ✓',
    of_toast_rejected: 'Offer rejected ✓',

    // Revenue
    rev_monthly: 'REVENUE BY MONTH',
    rev_by_tier: 'REVENUE BY TIER',
    rev_top_clients: 'TOP 10 CLIENTS',
    rev_bookings: n => `${n} booking${n > 1 ? 's' : ''}`,

    // Analytics
    an_clicks_14d: 'CLICKS — LAST 14 DAYS',
    an_top_slots: 'TOP 20 SLOTS BY CTR',
    an_top_sources: 'TOP SOURCES (30d)',
    an_no_slots: 'No data',
    an_no_referrer: 'No referrer data yet',
    an_clicks_unit: n => `${n} clicks`,

    // Config
    cfg_tiers_title: 'Progressive tier opening',
    cfg_tiers_sub: 'Real-time control — no redeployment needed',
    cfg_open: n => `${n} open`,
    cfg_closed: n => `${n} closed`,
    cfg_tier_open: '🟢 OPEN',
    cfg_tier_closed: '🔒 COMING SOON',
    cfg_tier_updating: '⏳ Updating…',
    cfg_modified_by: (who, when) => `Modified by ${who} · ${when}`,
    cfg_blocks: n => `${n} block${n > 1 ? 's' : ''}`,
    cfg_toast_opened: label => `Tier ${label} 🟢 opened ✓`,
    cfg_toast_closed: label => `Tier ${label} 🔒 closed ✓`,
    cfg_effect_note: '⚡ These changes take effect immediately. The checkout API checks',
    cfg_slots_title: 'Individually disabled blocks',
    cfg_slots_sub: 'Disable a specific slot without closing its entire tier',
    cfg_col_x: 'COLUMN X',
    cfg_col_y: 'ROW Y',
    cfg_reason: 'REASON (optional)',
    cfg_reason_ph: 'Maintenance, reserved, etc.',
    cfg_disable_btn: '⊗ Disable',
    cfg_invalid_coords: 'Invalid coordinates (1–36)',
    cfg_disabled_badge: n => `${n} block${n > 1 ? 's' : ''} disabled`,
    cfg_none_disabled: 'No individually disabled blocks',
    cfg_disabled_by: (when, who) => `Disabled ${when}${who ? ` by ${who}` : ''}`,
    cfg_reactivate: '✓ Reactivate',
    cfg_slot_disabled_toast: (x, y) => `Block (${x},${y}) disabled ✓`,
    cfg_slot_enabled_toast: (x, y) => `Block (${x},${y}) reactivated ✓`,
    cfg_audit_title: 'AUDIT LOG — LAST 100 ACTIONS',
    cfg_audit_empty: 'No actions recorded',

    // Dashboard
    dash_title: 'My Dashboard',
    dash_login_title: 'Sign in',
    dash_login_sub: 'Sign in to access your stats, tasks and offers.',
    dash_email_ph: 'your@email.com',
    dash_send_code: 'SEND MY CODE →',
    dash_sending: 'SENDING…',
    dash_code_sent: email => `Code sent to ${email}`,
    dash_code_ph: '000000',
    dash_connect: 'SIGN IN →',
    dash_connecting: 'VERIFYING…',
    dash_change_email: '← Change email',
    dash_invalid_token: 'Invalid or expired token',
    dash_logout: 'Sign out',
    dash_suspension_warning: n => `Your slot will be suspended in ${n} day${n > 1 ? 's' : ''} — complete your tasks today.`,
    dash_suspension_imminent: '⚠️ Suspension imminent',
    dash_tab_stats: '📊 Stats',
    dash_tab_tasks: '✦ Tasks',
    dash_tab_feed: '🌐 Feed',
    dash_tab_offers: '💰 Offers',
    dash_streak: 'STREAK',
    dash_slot_section: 'MY SLOT',
    dash_view_page: 'VIEW MY PAGE →',
    dash_clicks_7d: '7-DAY CLICKS',
    dash_ctr: 'AVG CTR',
    dash_coming_soon: 'coming soon',
    dash_connect_slot: 'connect your slot',
    dash_clicks_today: "TODAY'S CLICKS",
    dash_clicks_month: 'THIS MONTH',
    dash_chart_title: 'CLICKS — LAST 7 DAYS',
    dash_chart_days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    dash_feed_title: 'Community Feed',
    dash_feed_sub: 'Actions from Dyson Sphere members.',
    dash_feed_empty: 'The community feed is empty for now.',
    dash_feed_empty_sub: 'Complete your tasks to appear here!',
    dash_feed_proof: '↗ View proof',
    dash_offers_title: 'Buyout Offers',
    dash_offers_sub: 'Someone wants your slot? Accept or decline here.',
    dash_offers_empty: 'No pending offers.',
    dash_offers_empty_sub: 'Buyout offers will appear here when a buyer targets your slot.',

    // Tasks
    tasks_title: "Today's Tasks",
    tasks_all_done: '✓ All tasks completed!',
    tasks_progress: (done, total) => `${done}/${total} completed`,
    tasks_streak: n => `🔥 ${n}-day streak`,
    tasks_no_tasks: 'No tasks for today.',
    tasks_no_tasks_sub: 'Tasks are generated every morning for active subscribers.',
    tasks_validate_btn: 'VALIDATE TASK ✓',
    tasks_validating: 'VALIDATING…',
    tasks_proof_text_ph: 'Describe the action taken (required)',
    tasks_proof_url_ph: 'Proof link (optional)',
    tasks_proof_platform_ph: 'Platform (optional)',
    tasks_platforms: ['Instagram', 'Twitter/X', 'LinkedIn', 'TikTok', 'YouTube', 'Other'],
    tasks_done: '✓ DONE',
    tasks_top_streaks: '🏆 Top Streaks on the Grid',
    tasks_consecutive: 'consecutive days',
    task_share_grid_label: 'Share the grid',
    task_share_grid_desc: 'Share AdsMostFair on your social networks.',
    task_highlight_label: 'Highlight a neighbor',
    task_highlight_desc: 'Mention a neighboring creator on your networks.',
    task_content_label: 'Create content',
    task_content_desc: 'Publish content around the grid.',
    task_welcome_label: 'Welcome a new member',
    task_welcome_desc: 'Welcome a new member publicly.',
    task_recommend_label: 'Recommend 2 members',
    task_recommend_desc: 'Publicly recommend 2 members.',
    task_advantage_label: 'Offer an advantage',
    task_advantage_desc: 'Offer an exclusive perk to members.',
    task_perfect_label: 'Perfect slot',
    task_perfect_desc: 'Your slot is up to date — nothing to do!',
    task_icon_share: '📡',
    task_icon_highlight: '✨',
    task_icon_content: '🎨',
    task_icon_welcome: '👋',
    task_icon_recommend: '🤝',
    task_icon_advantage: '🎁',
    task_icon_perfect: '💎',

    // Slot page
    slot_available_title: (x, y) => `Slot [${x},${y}] available`,
    slot_available_desc: (tier, price) => `This ${tier} slot is free. Book it from ${price}/day and expose your brand to the whole grid.`,
    slot_book_btn: 'BOOK THIS SLOT →',
    slot_position: 'Position',
    slot_tier: 'Tier',
    slot_rate: 'Rate',
    slot_active_until: date => `ACTIVE until ${date}`,
    slot_share_title: 'SHARE THIS SLOT',
    slot_tweet: '𝕏 SHARE',
    slot_copy_link: '⎘ COPY LINK',
    slot_neighbors: 'NEIGHBORS ON THE GRID',
    slot_history: 'SLOT HISTORY',
    slot_cta_title: 'The advertising grid open to everyone',
    slot_cta_sub: '1,369 slots available · from €1 to €1,000/day',
    slot_explore: 'EXPLORE THE GRID →',
    slot_stat_clicks: 'TOTAL CLICKS',
    slot_stat_impressions: 'IMPRESSIONS',
    slot_stat_ctr: 'CTR',
    slot_share_occupied: (name, tier, x, y) => `Discover ${name} on AdsMostFair — ${tier} slot [${x},${y}]`,
    slot_share_free: (tier, x, y, price) => `${tier} slot [${x},${y}] available on AdsMostFair from ${price}/day`,
    slot_grid_link: 'Grid',
    slot_day: 'd',
    slot_no_neighbors: 'No active neighbors',
    slot_empty_history: 'No history',

    // Leaderboard
    lb_title: 'Leaderboard',
    lb_sub: 'Top performances on the grid.',
    lb_cat_clicks: '📡 Clicks',
    lb_cat_clicks_desc: 'Most clicked slots',
    lb_cat_streaks: '🔥 Streaks',
    lb_cat_streaks_desc: 'Best task streaks',
    lb_cat_revenue: '💰 Investment',
    lb_cat_revenue_desc: 'Biggest investors',
    lb_period_7d: '7 days',
    lb_period_30d: '30 days',
    lb_period_all: 'All time',
    lb_stat_clicks: 'TOTAL CLICKS',
    lb_stat_slots: 'SLOTS OCCUPIED',
    lb_stat_occ: 'OCCUPANCY RATE',
    lb_col_advertiser: 'ADVERTISER',
    lb_empty: 'No data for this period.',
    lb_empty_sub: 'Book a slot and come back!',
    lb_cta: 'Your name could be here.',
    lb_cta_btn: 'BOOK MY SLOT →',
    lb_clicks_unit: 'clicks',
    lb_days_unit: 'consecutive days',
    lb_invested_unit: 'invested',

    // Chat
    chat_title: 'Chat',
    chat_ch_general: 'General',
    chat_ch_annonces: 'Announcements',
    chat_ch_createurs: 'Creators',
    chat_ch_collab: 'Collab',
    chat_ch_music: 'Music',
    chat_ch_vitrines: 'Showcases',
    chat_ch_offtopic: 'Off-topic',
    chat_placeholder: 'Your message…',
    chat_pseudo_ph: 'Your username',
    chat_send: 'Send',
    chat_read_only: 'Read-only channel',
    chat_login_req: 'Sign in to participate',
    chat_empty: 'No messages in this channel.',
    chat_load_more: 'Load more',
    chat_delete_confirm: 'Delete this message?',
    chat_deleted: 'Message deleted',
    chat_too_long: max => `Message too long (max ${max} characters)`,

    // Grid / Sidebar
    grid_title: 'Grid',
    grid_slot_detail: 'Slot detail',
    grid_occupied: 'Occupied',
    grid_free: 'Available',
    grid_book: 'Book this slot',
    grid_offer: 'Make an offer',
    grid_pub_page: 'Public page →',
    grid_position: 'Position',
    grid_tier: 'Tier',
    grid_rate: 'Rate',
    grid_status: 'Status',
    grid_ends: 'Ends',
    grid_active_since: 'Active since',
    grid_days_left: n => `D-${n}`,
    grid_zoom_in: 'Zoom in',
    grid_zoom_out: 'Zoom out',
    grid_reset: 'Reset view',
    grid_filters: 'Filters',
    grid_search_ph: 'Find a slot…',
    grid_empty: 'Click on a slot to see details.',
    grid_legend: 'Legend',

    // Modals
    modal_book_title: 'Book this slot',
    modal_book_name: 'Your name / brand',
    modal_book_slogan: 'Slogan (optional)',
    modal_book_url: 'Destination URL',
    modal_book_email: 'Email',
    modal_book_start: 'Start date',
    modal_book_end: 'End date',
    modal_book_duration: 'Duration',
    modal_book_total: 'Total',
    modal_book_per_day: '/day',
    modal_book_days: n => `${n} day${n > 1 ? 's' : ''}`,
    modal_book_proceed: 'PROCEED TO PAYMENT →',
    modal_book_unavailable: 'This slot is not available for these dates.',

    modal_offer_title: 'Make a buyout offer',
    modal_offer_amount: 'Your offer (€)',
    modal_offer_name: 'Your name',
    modal_offer_email: 'Your email',
    modal_offer_msg: 'Message to the occupant (optional)',
    modal_offer_min: min => `Minimum offer: €${min}`,
    modal_offer_expires: 'Expires in 72h',
    modal_offer_btn: 'SUBMIT OFFER →',
    modal_offer_success: 'Offer sent! The occupant has 72h to respond.',

    modal_bug_title: 'Report a bug',
    modal_bug_desc: 'Description of the issue',
    modal_bug_email: 'Your email (optional)',
    modal_bug_btn: 'SEND REPORT →',
    modal_bug_success: 'Report sent, thank you!',

    modal_slot_visit: 'VISIT →',
    modal_slot_active: 'ACTIVE',
    modal_slot_free: 'AVAILABLE',
    modal_slot_offer_btn: 'Make an offer',
    modal_slot_book_btn: 'Book',
    modal_slot_clicks: 'clicks',
    modal_slot_impressions: 'impressions',

    // Waitlist
    wl_join_title: 'Join the Waitlist',
    wl_join_sub: 'Be among the first to access AdsMostFair.',
    wl_email_ph: 'your@email.com',
    wl_profile_ph: 'Your profile',
    wl_profile_creator: 'Creator',
    wl_profile_freelance: 'Freelancer',
    wl_profile_brand: 'Brand',
    wl_join_btn: 'JOIN →',
    wl_join_success: "You're on the list! We'll contact you at launch.",
    wl_already: "You're already registered.",

    // FAQ
    faq_title: 'Frequently Asked Questions',
    faq_sub: 'Everything you need to know about AdsMostFair.',
    faq_questions: [
      { q: 'What is AdsMostFair?', a: 'AdsMostFair is a digital advertising grid with 37×37 blocks (1,369 slots). Each block can be rented by the day by a creator, freelancer or brand to display their content.' },
      { q: 'How does pricing work?', a: 'The price depends on the position of the block (its "tier"). Center (Epicenter): €1,000/day. Edges (Viral): €1/day. In between: Prestige €100/d, Elite €50/d, Business €10/d, Standard €3/d.' },
      { q: 'How do I book a block?', a: 'Click on an available block, choose your dates, customize your content (colors, text, logo) and pay via Stripe. Your block is live within minutes.' },
      { q: 'Can I cancel my booking?', a: 'Bookings are non-refundable once payment is made. Contact support for exceptional circumstances.' },
      { q: 'What is the Dyson Sphere?', a: "Our gamification system. By subscribing to a daily plan, you get a rank (Signal → Chosen) and must complete daily tasks to keep your slot visible." },
      { q: 'How does the buyout offer system work?', a: 'If a slot you want is already occupied, make a buyout offer. The current occupant has 72h to accept or decline. If accepted, your payment is triggered and the slot is transferred to you.' },
      { q: 'Are my statistics publicly visible?', a: 'Click rankings are public. Your detailed stats (impressions, CTR) are only visible in your personal dashboard.' },
      { q: 'What content formats are accepted?', a: 'Text, image, video (link) or brand content. You define colors, text, logo and destination URL. Content is subject to moderation.' },
    ],

    // Legal
    legal_title: 'Legal Notice',
    legal_sub: 'Legal information relating to AdsMostFair.',
    legal_editor_title: 'Site Publisher',
    legal_editor: 'AdsMostFair is published by [Your Company], [Legal Form], with capital of €[X], registered under number [Company ID]. Registered office: [Address]. Email: contact@adsmostfair.com',
    legal_hosting_title: 'Hosting',
    legal_hosting: 'The site is hosted by Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, United States.',
    legal_director_title: 'Publication Director',
    legal_director: 'The founder of AdsMostFair (company being incorporated).',
    legal_ip_title: 'Intellectual Property',
    legal_ip: 'All content on AdsMostFair (text, images, code, design) is the exclusive property of AdsMostFair or their respective authors, protected by intellectual property law.',
    legal_liability_title: 'Limitation of Liability',
    legal_liability: 'AdsMostFair cannot be held responsible for content published by advertisers on the grid. Any inappropriate content can be reported via the bug report form.',
    legal_contact_title: 'Contact',
    legal_contact: 'For any questions: contact@adsmostfair.com',

    // Terms
    cgv_title: 'Terms of Sale',
    cgv_sub: 'Terms applicable to the use of AdsMostFair.',
    cgv_updated: 'Last updated',
    cgv_s1_title: 'Purpose',
    cgv_s1: 'These Terms of Sale govern the conditions under which AdsMostFair provides digital advertising space booking services on an interactive grid.',
    cgv_s2_title: 'Service Description',
    cgv_s2: 'AdsMostFair offers the rental of advertising blocks on a 37×37 grid. Each block is rented daily at a rate determined by its position (tier).',
    cgv_s3_title: 'Pricing and Payment',
    cgv_s3: 'Prices are displayed inclusive of taxes. Payment is made via Stripe. Any confirmed booking results in immediate billing. Prices may change without notice.',
    cgv_s4_title: 'Cancellation and Refunds',
    cgv_s4: 'Bookings are non-refundable once confirmed. In case of platform malfunction attributable to AdsMostFair, a replacement solution or partial refund may be offered.',
    cgv_s5_title: 'Ad Content',
    cgv_s5: 'The advertiser is solely responsible for the content they publish. Strictly prohibited: illegal, misleading, defamatory, pornographic content or content infringing third-party rights. AdsMostFair reserves the right to remove non-compliant content without refund.',
    cgv_s6_title: 'Personal Data',
    cgv_s6: 'The collection and processing of personal data is governed by our Privacy Policy.',
    cgv_s7_title: 'Governing Law',
    cgv_s7: 'These Terms are governed by French law. In case of dispute, the competent courts of [City] will have exclusive jurisdiction.',

    // Privacy
    priv_title: 'Privacy Policy',
    priv_sub: 'How we collect and use your data.',
    priv_updated: 'Last updated',
    priv_s1_title: 'Introduction',
    priv_s1: "AdsMostFair is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights regarding this data.",
    priv_s2_title: 'Data Collected',
    priv_s2: 'We collect: your email address (for login and notifications), your advertising content (name, slogan, colors, URL), your payment data (processed by Stripe, not stored by us), and anonymized browsing data (clicks, impressions, referrers).',
    priv_s3_title: 'Data Usage',
    priv_s3: 'Your data is used to: manage your account and bookings, display your ads on the grid, send you transactional notifications (confirmations, alerts), improve the platform via anonymized statistics.',
    priv_s4_title: 'Data Retention',
    priv_s4: 'Your data is retained for the duration of your relationship with AdsMostFair, then 3 years after your last activity. Payment data is not stored on our servers.',
    priv_s5_title: 'Your Rights (GDPR)',
    priv_s5: 'You have the right of access, rectification, deletion, portability and objection. Exercise your rights at: privacy@adsmostfair.com',
    priv_s6_title: 'Cookies',
    priv_s6: "AdsMostFair uses only strictly necessary cookies for functionality (session, language preferences). No advertising or third-party tracking cookies are used.",
    priv_s7_title: 'DPO Contact',
    priv_s7: 'For any questions about your data: privacy@adsmostfair.com',
  },
};

// ─── Context ────────────────────────────────────────────────────────────────
const I18nCtx = createContext(null);
const STORAGE_KEY = 'ads_lang';
const DEFAULT = 'fr';

// ─── Provider ────────────────────────────────────────────────────────────────
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT);

  // Lire localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && DICT[saved]) {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    } catch {}
  }, []);

  const setLang = useCallback((code) => {
    if (!DICT[code]) return;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
      document.documentElement.lang = code;
    } catch {}
  }, []);

  // Hook de traduction : t('key') ou t('key', arg1, arg2…)
  const t = useCallback((key, ...args) => {
    const d = DICT[lang] || DICT[DEFAULT];
    let v = d[key];
    // Fallback FR
    if (v === undefined && lang !== DEFAULT) v = DICT[DEFAULT][key];
    if (v === undefined) return key;
    if (typeof v === 'function') return v(...args);
    return v;
  }, [lang]);

  // "il y a Xh" selon la langue
  const ago = useCallback((dt) => {
    if (!dt) return '—';
    const s = Math.floor((Date.now() - new Date(dt)) / 1000);
    if (s < 60)    return t('ago', s, 's');
    if (s < 3600)  return t('ago', Math.floor(s / 60), 'm');
    if (s < 86400) return t('ago', Math.floor(s / 3600), 'h');
    return t('ago', Math.floor(s / 86400), 'd');
  }, [lang, t]);

  // Format date locale
  const fmtDate = useCallback((date, opts) => {
    if (!date) return '—';
    const locale = lang === 'en' ? 'en-GB' : 'fr-FR';
    return new Date(date).toLocaleDateString(locale, opts);
  }, [lang]);

  return (
    <I18nCtx.Provider value={{ lang, setLang, t, ago, fmtDate }}>
      {children}
    </I18nCtx.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useT() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useT() must be used inside <I18nProvider>');
  return ctx;
}

// ─── Composant LanguageSwitcher ──────────────────────────────────────────────
const A = { bg:'#01020A', border:'rgba(0,200,240,0.15)', border2:'rgba(0,200,240,0.30)', muted:'rgba(140,180,220,0.65)', text:'#DDE6F2', accent:'#00C8E4', card:'rgba(1,6,18,0.98)' };
const LANGS = { fr: { label: 'Français', flag: '🇫🇷' }, en: { label: 'English', flag: '🇬🇧' } };

export function LanguageSwitcher({ compact = false, style: sx }) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const cur = LANGS[lang] || LANGS.fr;

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...sx }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={cur.label}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 4 : 6,
          background: 'transparent', border: `1px solid ${A.border}`, borderRadius: 6,
          padding: compact ? '5px 8px' : '7px 12px',
          color: A.muted, cursor: 'pointer', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.06em', transition: 'border-color 0.15s, color 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = A.border2; e.currentTarget.style.color = A.text; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = A.border; e.currentTarget.style.color = A.muted; }}
      >
        <span style={{ fontSize: 15 }}>{cur.flag}</span>
        {!compact && <span>{cur.label}</span>}
        <span style={{ fontSize: 9, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 148,
            background: A.card, border: `1px solid ${A.border2}`, borderRadius: 8,
            overflow: 'hidden', zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}>
            {Object.entries(LANGS).map(([code, { label, flag }]) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '11px 14px',
                  background: lang === code ? 'rgba(0,200,240,0.08)' : 'transparent',
                  border: 'none',
                  borderLeft: `2px solid ${lang === code ? A.accent : 'transparent'}`,
                  color: lang === code ? A.accent : A.muted,
                  cursor: 'pointer', fontSize: 13, fontWeight: lang === code ? 700 : 500,
                  textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (lang !== code) e.currentTarget.style.background = 'rgba(0,200,240,0.04)'; }}
                onMouseLeave={e => { if (lang !== code) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 17 }}>{flag}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {lang === code && <span style={{ fontSize: 11, color: A.accent }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
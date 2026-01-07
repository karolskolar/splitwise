# 🏔️ Kalkulačka nákladov z dovolenky

Jednoduchá webová aplikácia na spravodlivé rozdelenie nákladov z dovolenky medzi skupiny a jednotlivcov.

## ✨ Funkcie

- **Skupiny a jednotlivci** - podpora pre rodiny/skupiny aj jednotlivých účastníkov (max 15)
- **Koeficienty** - nastaviteľné koeficienty pre každú osobu (deti jedia menej ako dospelí)
- **Kategórie nákladov** - ubytovanie, strava, iné
- **Flexibilné rozdelenie** - rovným dielom alebo podľa osôb a koeficientov
- **Zdieľanie** - vygenerujte link a pošlite ostatným účastníkom (bez potreby prihlásenia)
- **Offline** - funguje aj bez internetu (dáta sa ukladajú v prehliadači)

## 🚀 Demo

[**Otvoriť aplikáciu**](https://VASEMENO.github.io/vacation-calculator/)

## 📦 Inštalácia

### Možnosť 1: GitHub Pages (odporúčané)

1. Forkni tento repozitár
2. Choď do **Settings → Pages**
3. Vyber **Source: Deploy from a branch**
4. Vyber **Branch: main** a **/ (root)**
5. Klikni **Save**
6. Za pár minút bude aplikácia dostupná na `https://VASEMENO.github.io/vacation-calculator/`

### Možnosť 2: Vlastný server

Stačí nahrať `index.html` na akýkoľvek webový server. Aplikácia je kompletne statická (žiadny backend).

```bash
# Príklad s Nginx
cp index.html /var/www/html/vacation-calculator/

# Príklad s Python (pre lokálny vývoj)
python -m http.server 8000
```

### Možnosť 3: Lokálne použitie

Jednoducho otvorte `index.html` v prehliadači.

## 🔧 Technológie

- **React 18** - UI framework
- **Tailwind CSS** - styling
- **LocalStorage** - ukladanie dát
- **Base64 URL encoding** - zdieľanie prepočtov

## 📖 Ako to funguje

### Koeficienty pre stravu

| Typ osoby | Koeficient | Popis |
|-----------|------------|-------|
| Dospelý | 1.0× | plná porcia |
| Dieťa 8+ rokov | 0.7× | väčšia porcia |
| Dieťa 5-7 rokov | 0.5× | polovičná porcia |
| Dieťa do 5 rokov | 0.3× | malá porcia |

### Spôsoby rozdelenia

- **Rovným dielom** - náklady sa rozdelia rovnako medzi všetkých účastníkov
- **Podľa osôb** - náklady sa rozdelia podľa súčtu koeficientov × počet nocí

## 📄 Licencia

MIT License - používajte slobodne.

## 🤝 Prispievanie

Pull requesty sú vítané! Pre väčšie zmeny najprv otvorte issue.

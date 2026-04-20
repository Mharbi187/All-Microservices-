# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])


            name            |        title        |          email
----------------------------+---------------------+--------------------------
 Comit?? R??gional Tunis    | PRESIDENT           | pres.tunis@crt.tn
 Comit?? R??gional Tunis    | SECRETAIRE_GENERAL  | pending.vol@crt.tn
 Comit?? R??gional Tunis    | RESP_DIFFUSION      | resp.diffusion@crt.tn       
 Comit?? R??gional Tunis    | RESP_JEUNESSE       | resp.jeunesse@crt.tn        
 Comit?? R??gional Tunis    | RESP_SANTE          | resp.sante@crt.tn
 Comit?? R??gional Tunis    | RESP_ACTION_SOCIALE | resp.social@crt.tn
 Comit?? R??gional Tunis    | RESP_IMMIGRATION    | resp.immigration@crt.tn     
 Comit?? R??gional Tunis    | RESP_DIFFUSION      | resp.diffusion@crt.tn    
 Comit?? R??gional Tunis    | RESP_JEUNESSE       | resp.jeunesse@crt.tn     
 Comit?? R??gional Tunis    | RESP_SANTE          | resp.sante@crt.tn        
 Comit?? R??gional Tunis    | RESP_ACTION_SOCIALE | resp.social@crt.tn       
 Comit?? R??gional Tunis    | RESP_IMMIGRATION    | resp.immigration@crt.tn  
 Comit?? R??gional Tunis    | RESP_VFF            | resp.vff@crt.tn
 Comit?? R??gional Tunis    | RESP_CATASTROPHES   | resp.catastrophes@crt.tn 
 Comit?? R??gional Tunis    | RESP_SECOURISME     | resp.secourisme@crt.tn   
 Comit?? R??gional Sousse   | PRESIDENT           | ahmed.sousse@crt.tn      
 Comit?? R??gional Tunis    | RESP_DIFFUSION      | resp.diffusion@crt.tn  
 Comit?? R??gional Tunis    | RESP_JEUNESSE       | resp.jeunesse@crt.tn   
 Comit?? R??gional Tunis    | RESP_SANTE          | resp.sante@crt.tn      
 Comit?? R??gional Tunis    | RESP_ACTION_SOCIALE | resp.social@crt.tn     
 Comit?? R??gional Tunis    | RESP_IMMIGRATION    | resp.immigration@crt.tn
 Comit?? R??gional Tunis    | RESP_VFF            | resp.vff@crt.tn        
 Comit?? R??gional Tunis    | RESP_CATASTROPHES   | resp.catastrophes@crt.tn
 Comit?? R??gional Tunis    | RESP_SECOURISME     | resp.secourisme@crt.tn 
 Comit?? R??gional Sousse   | PRESIDENT           | ahmed.sousse@crt.tn    
 Comit?? R??gional Sousse   | SECRETAIRE_GENERAL  | sara.sousse@crt.tn     
 Comit?? R??gional Sfax     | PRESIDENT           | ali.sfax@crt.tn        
 Comit?? R??gional Sfax     | VICE_PRESIDENT      | ines.sfax@crt.tn       
 Comit?? R??gional Sfax     | SECRETAIRE_GENERAL  | mariem.nabeul@crt.tn   
 Comit?? Local Bardo        | PRESIDENT           | khaled.bardo@crt.tn    
 Comit?? Local Bardo        | SECRETAIRE_GENERAL  | houda.ariana@crt.tn    
 Comit?? Local Ariana       | PRESIDENT           | houda.ariana@crt.tn    
 Comit?? Local Ariana       | SECRETAIRE_GENERAL  | pending.vol@crt.tn     
 Comit?? R??gional Monastir | PRESIDENT           | pres.monastir@crt.tn   
 Comit?? R??gional Monastir | SECRETAIRE_GENERAL  | sg.monastir@crt.tn     
 Comit?? R??gional Monastir | RESP_JEUNESSE       | test.pending1@crt.tn   
(22 rows)

```

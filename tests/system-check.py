"""Offline Cooklit simulations. Run from any folder with Python 3 on macOS.
Uses the system JavaScriptCore engine; browser/network services are mocked.
Does not validate live camera capture, Supabase deployment, or provider credentials.
"""
import os
from pathlib import Path
os.chdir(Path(__file__).resolve().parent.parent)
import ctypes as c, json, re
from pathlib import Path
j=c.CDLL('/System/Library/Frameworks/JavaScriptCore.framework/JavaScriptCore');p=c.c_void_p
for n,args,res in [('JSGlobalContextCreate',[p],p),('JSStringCreateWithUTF8CString',[c.c_char_p],p),('JSEvaluateScript',[p,p,p,p,c.c_int,c.POINTER(p)],p),('JSValueToStringCopy',[p,p,c.POINTER(p)],p),('JSStringGetMaximumUTF8CStringSize',[p],c.c_size_t),('JSStringGetUTF8CString',[p,c.c_char_p,c.c_size_t],c.c_size_t)]:
    f=getattr(j,n);f.argtypes=args;f.restype=res
ctx=j.JSGlobalContextCreate(None)
def run(src):
    ex=p();val=j.JSEvaluateScript(ctx,j.JSStringCreateWithUTF8CString(src.encode()),None,None,1,c.byref(ex));st=j.JSValueToStringCopy(ctx,ex.value or val,None);size=j.JSStringGetMaximumUTF8CStringSize(st);b=c.create_string_buffer(size);j.JSStringGetUTF8CString(st,b,size);t=b.value.decode()
    if ex.value:raise Exception(t)
    return t
def plain(path):return re.sub(r'^import .*?;\n','',Path(path).read_text(),flags=re.M).replace('export function ','function ').replace('export async function ','async function ').replace('import.meta.url','"https://example.test/ai-agent.js"')

engine='const console={log:()=>{}};const catalog='+Path('recipe.json').read_text()+';'+plain('supabase/functions/_shared/recipe-matcher.js')+plain('recipe-preferences.js')
print(run(engine+plain('tests/recipe-preferences.test.js')+'"Preference tests passed";'))
print(run(plain('tests/recipe-matcher.test.js')+'"Matcher tests passed";'))
print(run(plain('supabase/functions/_shared/receipt-ingredients.js')+plain('tests/receipt-ingredients.test.js')+'"OCR tests passed";'))
for name in ['results.js','ai-agent.js','auth-client.js']:
    print(run('new Function('+json.dumps(plain(name))+'); '+json.dumps(name+' syntax checked')))
ctx=j.JSGlobalContextCreate(None)
mock='''
class TestNode {
 constructor(tag){this.tag=tag;this.children=[];this.events={};this.value="";this.hidden=false;this.textContent="";this.attributes={};}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(name,value){this.attributes[name]=value;}
 addEventListener(name,fn){this.events[name]=fn;}
 querySelectorAll(tag){return this.children.flatMap(n=>[...(n.tag===tag?[n]:[]),...n.querySelectorAll(tag)]);}
 querySelector(tag){return this.querySelectorAll(tag)[0];}
 remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
 focus(){}
}
const nodes=new Map();
const document={createElement:tag=>new TestNode(tag),getElementById:id=>{if(!nodes.has(id))nodes.set(id,new TestNode(id));return nodes.get(id);},querySelectorAll:()=>[]};
for(const id of ["cuisineSelect","readinessSelect","dietSelect"])document.getElementById(id).value="all";
document.getElementById("collectionSelect").value="matches";
const saved=new Map();
const localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
const URL=class{constructor(value){this.href=value;this.protocol="https:";}};
let pending=[];
function findRecipes(items,options){const recipes=matchRecipes(testCatalog,items);options.onMatches({recipes});return new Promise(resolve=>pending.push(()=>resolve({recipes,source:"ingredient-match"})));}
function check(value,message){if(!value)throw new Error(message);}
'''
source=plain('results.js').split('for (const id of ["cuisineSelect"')[0]
tests='''
let uiResult="pending";
(async()=>{
 catalog=testCatalog;
 ingredients=["tomato","garlic","pasta"];
 renderIngredients();
 check(ingredientList.children.length===3,"Missing editable rows");
 ingredientList.children[0].querySelector("input").value="egg";
 ingredientList.children[1].children[1].events.click();
 document.getElementById("ingredientForm").events.submit({preventDefault(){}});
 check(ingredients.length===2 && ingredients[0]==="egg","Edits/removal not applied");
 check(JSON.parse(localStorage.getItem("receiptIngredients"))[0]==="egg","Edits not persisted");
 ingredientList.children[0].querySelector("input").value="pizza dough";
 const editedRequest=findFromEditor();
 check(ingredients[0]==="pizza dough","Find Recipes ignored unsaved editor values");
 check(JSON.parse(localStorage.getItem("receiptIngredients"))[0]==="pizza dough","Find Recipes did not persist current values");
 pending[pending.length-1]();await editedRequest;
 check(visibleRecipes.some(recipe=>recipe.id==="cheese-pizza"),"Find Recipes did not match current pizza ingredients");
 check(aiFailureMessage("not-configured").includes("OPENAI_API_KEY"),"Missing-key diagnostic absent");
 const picks=matchRecipes(testCatalog,ingredients).map((recipe,index)=>({...recipe,aiRecommended:index===0}));
 displayRecipes(picks);
 check(recipeList.children[0].children[0].textContent.startsWith("AI recommendations"),"AI picks not displayed first");
 check(recipeList.querySelectorAll("article").length===picks.length,"Recipe cards missing or duplicated");
 syncFavorites({id:"alice"});
 toggleFavorite("online-carbonara");
 check(favoriteIds.has("online-carbonara"),"Save button failed");
 collectionSelect.value="favorites";ingredients=[];refreshCollection();
 check(recipeList.children.length===1,"Favorites unavailable without receipt");
 document.getElementById("readinessSelect").value="ready";renderCuisineGroups();
 check(recipeList.querySelectorAll("article").length===0,"Ready filter failed for favorites");
 document.getElementById("readinessSelect").value="all";
 syncFavorites(null);check(favoriteIds.size===0 && recipeList.querySelectorAll("article").length===0,"Signout leaked favorites");
 collectionSelect.value="matches";
 ingredients=["egg"];const oldRequest=showRecipes();
 ingredients=["tomato"];const newRequest=showRecipes();
 pending[pending.length-1]();await newRequest;
 const ids=visibleRecipes.map(r=>r.id).join();
 pending[pending.length-2]();await oldRequest;
 check(visibleRecipes.map(r=>r.id).join()===ids,"Stale response overwrote newer edits");
 ingredients=[];await showRecipes();
 check(visibleRecipes.length===0 && generateButton.disabled,"Empty ingredient list left old recipes");
 uiResult="Editor, favorites, combined filters, signout and stale-response UI checks passed";
})().catch(error=>{uiResult="FAILED: "+error.message;});
'''
run('const testCatalog='+Path('recipe.json').read_text()+';'+plain('supabase/functions/_shared/recipe-matcher.js')+plain('recipe-preferences.js')+mock+source+tests)
result=run('uiResult');print(result)
assert result!='pending' and not result.startswith('FAILED'),result

ctx=j.JSGlobalContextCreate(None)
s=Path('signin.js').read_text();snippet=s[s.index('googleButton.addEventListener'):]
mock='''
const console={error:()=>{}};
let callback;
const label={textContent:"Continue with Google"};
const googleButton={disabled:false,dataset:{},querySelector:()=>label,setAttribute:()=>{},addEventListener:(_name,fn)=>{callback=fn;}};
const signinButton={};
const displayNameInput={value:"Test User",focus:()=>{}};
const statusMessage={textContent:"",classList:{toggle:()=>{}}};
const sessionStorage={setItem:()=>{throw Object.assign(new Error("blocked"),{name:"SecurityError"});},removeItem:()=>{throw new Error("blocked");}};
let oauthCalls=0;
const supabase={auth:{signInWithOAuth:()=>{oauthCalls++;}}};
let result="pending";
'''
run(mock+snippet+'''callback().then(()=>{
if(googleButton.disabled || label.textContent!=="Continue with Google" || !statusMessage.textContent.includes("Allow browser storage") || oauthCalls) throw new Error("Google sign-in storage handling failed");
result="Google sign-in blocked-storage handling passed";
}).catch(error=>{result="FAILED: "+error.message;});''')
result=run('result');print(result);assert result.startswith('Google'),result

ctx=j.JSGlobalContextCreate(None)
ai_mock='''
const console={log:()=>{}};
const SUPABASE_URL="https://example.test";
const SUPABASE_ANON_KEY="test-public-key";
const URL=class{constructor(path){this.href=path;}};
const AbortSignal={timeout:()=>null};
const setTimeout=()=>1;
const clearTimeout=()=>{};
let mode="offline";
let signedIn=false;
let calls=0;
const getAuthClient=async()=>({auth:{getSession:async()=>({data:{session:signedIn?{access_token:"test-session"}:null}})}});
const fetch=async(url,options)=>{
 if(url.href==="./recipe.json")return{ok:true,json:async()=>sampleCatalog};
 calls++;
 if(mode==="offline")throw new Error("offline");
 if(mode==="401" || mode==="404")return{ok:false,status:Number(mode)};
 if(mode==="not-configured")return{ok:true,json:async()=>({source:"ingredient-match",reason:"not-configured"})};
 const items=JSON.parse(options.body).ingredients;
 const matches=matchRecipes(sampleCatalog,items).slice(0,3);
 if(mode==="invalid")matches[0]={id:"invented"};
 return{ok:true,json:async()=>({source:"ai-catalog",recipes:matches})};
};
let aiResult="pending";
function verify(condition,message){if(!condition)throw new Error(message);}
'''
ai_tests='''
(async()=>{
 const groceries=["egg","tomato","chicken thigh"];
 let immediate=false;
 let result=await findRecipes(groceries,{onMatches:r=>{immediate=r.recipes.length>0;}});
 verify(immediate && result.signInRequired && calls===0,"Signed-out immediate matching failed");
 signedIn=true;
 result=await findRecipes(groceries);verify(result.recipes.length>0 && result.source==="ingredient-match","Offline fallback failed");
 mode="401";result=await findRecipes(groceries);verify(result.signInRequired,"Expired session handling failed");
 mode="404";result=await findRecipes(groceries);verify(result.reason==="not-deployed","Missing deployment handling failed");
 mode="not-configured";result=await findRecipes(groceries);verify(result.reason==="not-configured","Missing-key handling failed");
 mode="invalid";result=await findRecipes(groceries);verify(result.source==="ingredient-match" && result.reason==="catalog-mismatch","Invented AI recipe accepted or missing diagnostic");
 mode="valid";result=await findRecipes(groceries);
 verify(result.source==="ai-catalog" && result.recipes.filter(r=>r.aiRecommended).length===3,"AI picks failed");
 verify(result.recipes.length===matchRecipes(sampleCatalog,groceries).length,"AI discarded other matches");
 const before=calls;result=await findRecipes(["dragon fruit"]);verify(!result.recipes.length && calls===before,"Empty results triggered AI");
 aiResult="AI simulations passed: signed out, offline, expired session, missing deployment/key, invalid IDs, success, empty results";
})().catch(error=>{aiResult="FAILED: "+error.message;});
'''
run('const sampleCatalog='+Path('recipe.json').read_text()+';'+plain('supabase/functions/_shared/recipe-matcher.js')+ai_mock+plain('ai-agent.js')+ai_tests)
result=run('aiResult');print(result)
assert result!='pending' and not result.startswith('FAILED'),result

from html.parser import HTMLParser
from urllib.parse import urlsplit
class PageAudit(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.refs=[]
    def handle_starttag(self, tag, attrs):
        values=dict(attrs)
        if 'id' in values: self.ids.append(values['id'])
        for key in ('href','src'):
            value=values.get(key,''); parsed=urlsplit(value)
            if value and not parsed.scheme and parsed.path: self.refs.append(parsed.path)
for page in ['cooking','camera','results','signin','signup','forgot-password','change-password']:
    audit=PageAudit();audit.feed(Path(page+'.html').read_text())
    assert len(audit.ids)==len(set(audit.ids)),f'Duplicate ID in {page}'
    for ref in audit.refs: assert Path(ref).exists(),f'Missing local asset: {page}: {ref}'
    script=Path(page+'.js').read_text()
    for id in re.findall(r'getElementById\("([^"]+)"\)',script):
        assert id in audit.ids,f'Missing DOM element: {page}: {id}'
for path in Path('.').glob('*.js'):
    for target in re.findall(r'from\s+["\'](\.[^"\']+)["\']',path.read_text()):
        assert (path.parent/target).exists(),f'Missing module {target}'
    code=re.sub(r'^import\s+[\s\S]*?;\s*','',path.read_text(),flags=re.M)
    code=code.replace('export async function ','async function ').replace('export function ','function ').replace('export const ','const ').replace('import.meta.url','"https://example.test/module.js"')
    run('new (Object.getPrototypeOf(async function(){}).constructor)('+json.dumps(code)+');')
print('Core page assets, DOM IDs, local module imports and browser JavaScript syntax passed.')
print('External links intentionally excluded. Live services and the TypeScript server runtime were not tested.')

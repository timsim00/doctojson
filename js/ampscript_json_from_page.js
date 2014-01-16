String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
};

var ET = {

    uri: {
        proxy: 'getpage.php',
        domain: 'http://help.exacttarget.com',
        funcList: 'http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_functions/'
    },
    funcs: [], 
    funcMap: {},
    pages: [],
    pagesLoaded: 0,
    json: {},
    
    getFuncNames: function(data) {
        var $page = $(data);
        $page.find('ul').eq(3).children('li').each(function(i,val){
            var o = {}, $ele = $(this);
            o.text = $ele.text();
            o.href = $ele.find('a').attr('href');
            if (o.href.indexOf('/en') == 0) {
                o.href = ET.uri.domain + o.href;
            }
            var a = o.href.split('#');
            o.folder = a[0];
            o.funcName = a[1];

            if (o.funcName == 'UpsertContacts') {
                o.funcName = 'UpsertContact';
                o.text = 'UpsertContact(S1,S2,S3,S4,S5...)';
            }
            
            o.title = $ele.find('a').attr('title');
            
            //find unique hrefs
            var found = false, j=0;            
            do {
                if (ET.pages[j] && ET.pages[j].url==o.folder) {
                    found = true;
                } else {
                    j++;
                }
            } while (j<ET.pages.length && !found);
            if (!found) {
                var a = o.folder.split('/'), cat = a[a.length-2].replace('ampscript_functions','').replace(/_/g,' ');
                cat = $.trim(cat);
                cat = toTitleCase(cat);
                ET.pages.push({url:o.folder, type:'function', category: cat});
                j = ET.pages.length-1;
            }
            
            o.pageIdx = j;
            ET.funcs.push(o);
            ET.funcMap[o.text] = i;
        });
    },
    
    getAllPages: function(a,b) {
        console.log('getAllPages');                   
        for(var j=0;j<ET.pages.length;j++) { 
            ET.getPage(ET.pages[j]);
        }        
    },
    
    getPage: function(oPage) {
        console.log('getting page: ' + oPage.category);
        $.ajax({
            url:ET.uri.proxy + '?p=' + oPage.url, 
            type:'GET'
        })
        .done(function(data) {                        
            ET.parseContent(oPage, data);
            $.publish('pageLoaded', oPage.category);
        });     
    },
    
    pageLoadedCheckin: function(a,b) {
        console.log('page loaded: ' + b);
        ET.pagesLoaded++;
        if (ET.pagesLoaded == ET.pages.length) {
            $.publish('allPagesLoaded');
        }
    },
    
    parseContent: function(oPage, data) {
        oPage.data = $(data);
        oPage.json = {};
        var a = oPage.aText = oPage.data.find('.span8').not('#PageFeedbackForm').text().split('\n'),
            len = a.length,
            str, currFunc,currSection,currPage,o;
        for(var i=0;i<len;i++) {
            str = $.trim(a[i]);
            if (str.replace(/ /g,'') === '') { 
                //ignore empty strings
            } else if (ET.funcMap[str] > -1) {
                currFunc = ET.funcs[ ET.funcMap[str] ];
                currSection = 'desc';
                currPage = ET.pages[ currFunc.pageIdx ];
                oPage.json[currFunc.funcName] = {desc:[],args:[],exps:[],def:currFunc.text,type:currPage.type,cat:currPage.category,url:currFunc.href};              
            } else if (!!currFunc && str == 'Arguments') {
                currSection = 'args';
            } else if (!!currFunc && (str.endsWith('Example') || str.endsWith('Examples'))) {
                if (str !== 'Example' && str !== 'Examples') {
                    oPage.json[currFunc.funcName][currSection].push(str);
                }
                currSection = 'exps';              
            } else if (!!currFunc && !!currSection) {
                oPage.json[currFunc.funcName][currSection].push(str);
            }
        }
    },
    
    buildFinalJSON: function() {
        console.log('buildFinalJSON');
        ET.json = {};
        for(var j=0;j<ET.funcs.length;j++) { 
            var func = ET.funcs[j],
                page = ET.pages[ func.pageIdx ];
            ET.json[func.funcName] = page.json[func.funcName];   
        }
    },

    init: function() {
        $.subscribe('getFuncNames', ET.getAllPages);
        $.subscribe('allPagesLoaded', ET.buildFinalJSON);
        $.subscribe('pageLoaded', ET.pageLoadedCheckin);
        $.ajax({url:ET.uri.proxy + '?p=' + ET.uri.funcList, type:'GET'})
        .done(function(data) {
            ET.getFuncNames(data);
            $.publish('getFuncNames');
        });     
    }
}


/*        
    buildJSON: function() {
        console.log('buildJSON');
        for(var j=0;j<ET.funcs.length;j++) { //
            var func = ET.funcs[j],
                page = ET.pages[ func.pageIdx ],
                $p = page.data;
                json = {},
                $title = p$.find('a[name="'+ func.funcName +'"]').closest('h3'), //$p.find('h3:contains('+ func.funcName +')'),
                $scope = $title.nextUntil('h3'),
                $desc = $title.nextUntil('div');

            json.type = page.type;
            json.def = func.text;
            json.cat = page.category;
            json.url = func.href;
            if ($title.length == 1) {
                json.desc = $desc.text();
                
                $scope.each(function(i,val){
                    var $ele = $(this);
                    if ($ele.find('h3').length > 0) {
                        json.note = 'malformed html';
                    } else if ($ele.find('div:contains(Arguments)').length > 0) {
                        $ele.find('li').each(function(i,val){
                            var str = $(this).text();
                            str = str.replace(String.fromCharCode(160,160,160),'   ');
                            json.args.push(str);
                        });                    
                    } else if ($ele.find('div:contains(Example)').length > 0) {
                    
                    }
                
                });
                
                var $ele = $block.find('h4:contains(Arguments)');
                if ($ele.length > 0) {
                    json.args = [];
                    $ele.next().find('li').each(function(i,val){
                        var str = $(this).text();
                        str = str.replace(String.fromCharCode(160,160,160),'   ');
                        json.args.push(str);
                    });
                }
                var $ele = $block.find('h4:contains(Example)');
                if ($ele.length > 0) {
                    json.example = [];
                    $ele.siblings().each(function(i,val){
                        json.example.push( $(this).text() );
                    });
                }               
            }

            ET.json[func.funcName] = json;
        }        
    },    

    buildJSON: function() {
        console.log('buildJSON');
        for(var j=0;j<ET.funcs.length;j++) { //
            var func = ET.funcs[j],
                page = ET.pages[ func.pageIdx ],
                $p = page.data;
                json = {},
                $block = $p.find('a[name="'+ func.funcName +'"]').closest('div');         

            json.type = page.type;
            json.def = func.text;
            json.cat = page.category;
            if ($block.length == 1) {
                json.desc = $block.find('p').eq(0).text();
                
                var $ele = $block.find('h4:contains(Arguments)');
                if ($ele.length > 0) {
                    json.args = [];
                    $ele.next().find('li').each(function(i,val){
                        var str = $(this).text();
                        //str = str.split(String.fromCharCode(160,160,160,32));
                        //json.args[str[0]] = str[1];
                        json.args.push(str);
                    });
                }
                var $ele = $block.find('h4:contains(Example)');
                if ($ele.length > 0) {
                    json.example = [];
                    $ele.siblings().each(function(i,val){
                        json.example.push( $(this).text() );
                    });
                }               
            }

            ET.json[func.funcName] = json;
        }        
    },
*/    
/*
$('a[name="Add"]').closest('div')

folder: "http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/utilities_ampscript_functions/"
href: "http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/utilities_ampscript_functions/#Add"
page: "Add"
pageIdx: 0
text: "Add(N1,N2)"
title: "/link/45bdf72f46134cae88079d95669b305f.aspx?id=6371&epslanguage=en#Add(N1.2cN2)"


   "functions": [
      "Add":{
        "type":"function",
        "def":"Add(N1,N2)"
        "desc":"Returns the sum of N1 and N2.",
        "note":"",
        "args":{
          "N1":"First value to add",
          "N2":"Second value to add"
        },
        "Example":[
          "Given @abc=10 and @def=20",
          "%%=Add(@abc,@def)=%%",
          "The system returns: 30"
        ]
      },
      
      

$.ajax('http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/utilities_ampscript_functions/')
.done(function(data) {
  console.log( $(data).find('a[name="Add"]').closest('h3').text() );
});


http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/utilities_ampscript_functions/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/ampscript_functions_for_use_with_microsoft_dynamics_crm/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/api_ampscript_functions/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/content_ampscript_functions/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/microsite_and_landing_page_ampscript_functions/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/data_extension_ampscript_functions/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/ampscript_functions_for_use_with_salesforcecom/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/datetime_ampscript_functions/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/social_ampscript_functions/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/http_ampscript_functions/
/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/ampscript_functions_for_use_with_microsoft_dynamics_crm/
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/contacts_ampscript_functions/ 


<a href="/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/ampscript_functions_for_use_with_microsoft_dynamics_crm/#RetrieveMscrmRecords(S1.2cS2.2cS3a.2cS3b.2cS3c)" title="/link/68b5465cdfb34e3687aa570f9191f781.aspx?id=6360&amp;epslanguage=en#RetrieveMscrmRecords(S1.2cS2.2cS3a.2cS3b.2cS3c)">RetrieveMscrmRecords(S1,S2,S3a,S3b,S3c)</a>
http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/ampscript_functions_for_use_with_microsoft_dynamics_crm/#RetrieveMscrmRecords(S1.2cS2.2cS3a.2cS3b.2cS3c)



  for(var j=0;j<ethrefs.length;j++) {
    if (ethrefs[j]==o.href) {
      found = true;
      break;
    }

  }
<a href="http://help.exacttarget.com/en/documentation/exacttarget/content/ampscript/ampscript_syntax_guide/utilities_ampscript_functions/#Add" title="/link/45bdf72f46134cae88079d95669b305f.aspx?id=6371&amp;epslanguage=en#Add(N1.2cN2)">Add(N1,N2)</a>
*/


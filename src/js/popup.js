//
//Utilities
//

//Work with local storage to read some settings
function getSavedValue(PropertyName, callback) {
  chrome.storage.local.get(PropertyName, (items) => {
    propertyValue = items[PropertyName];
    callback(propertyValue);
  });
}

//Work with local storage to save some settings
function saveValue(PropertyName, PropertyValue) {
  var items = {};
  items[PropertyName] = PropertyValue;

  chrome.storage.local.set(items);
}

//builds a default select option
function createDefaultOption(ddElement, OptionText)
{
  //kill the current options in the Content Type dropdown
  while (ddElement.firstChild) {
    ddElement.removeChild(ddElement.firstChild);
  }

  //Add in the default choice again
  var opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "<"+ OptionText +">";
  ddElement.appendChild(opt);
}


//
//Kentico Cloud Deliver API methods
//

//Base call to the Kentico Cloud Deliver API
function kcAPILoad(UrlPath, SuccessCallback)
{
  if(UrlPath == "")
    return;

  var projid = projectid.value;
  if(projid == "")
    return;
  
  var baseUrl = "https://deliver.kenticocloud.com/" + projid ;

  var xhr = new XMLHttpRequest();
  xhr.open("GET", baseUrl + UrlPath, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      SuccessCallback(resp);
    }
  }
  xhr.send();
}

//get content types
//https://deliver.kenticocloud.com/6680bf6d-984c-4080-b416-4e3358bb54b4/types
function kcAPILoadContentTypes(SuccessCallback)
{
  kcAPILoad("/types", SuccessCallback);
}

//get content type items
//https://deliver.kenticocloud.com/6680bf6d-984c-4080-b416-4e3358bb54b4/items?system.type=homepage__page_
function kcAPILoadContentTypeItems(SuccessCallback)
{
  var typeid = contentTypes.options[contentTypes.selectedIndex].value;

  kcAPILoad("/items?system.type="+ typeid, SuccessCallback);
}

//get specific content type item
//https://deliver.kenticocloud.com/6680bf6d-984c-4080-b416-4e3358bb54b4/items/homepage
function kcAPILoadContentTypeItemElements(SuccessCallback)
{
  var itemCodeName = contentTypeItems.options[contentTypeItems.selectedIndex].value;

  kcAPILoad("/items/" + itemCodeName, SuccessCallback);
}


//
//Populators
//

//populate with the Types array that the Delivery API returns
function populateContentTypes(Response)
{
  createDefaultOption(contentTypes, "Select a content type");

  Response.types.forEach(function(elType) {
    var opt = document.createElement("option");
    opt.value = elType.system.codename;
    opt.textContent = elType.system.name;
    contentTypes.appendChild(opt);
  }, this);
}

//populate with the Type Items array that the Delivery API returns
function populateContentTypeItems(Response)
{
  createDefaultOption(contentTypeItems, "Select a content item");

  Response.items.forEach(function(elItem) {
    var opt = document.createElement("option");
    opt.value = elItem.system.codename;
    opt.textContent = elItem.system.name;
    contentTypeItems.appendChild(opt);
  }, this);
}

//populate with the Content Type Item's Elements that the Delivery API returns
function populateContentTypeItemElements(Response)
{
  createDefaultOption(contentTypeElements, "Select an element");

  for(property in Response.item.elements)
  {
    if (Response.item.elements.hasOwnProperty(property))
    { 
      var element = Response.item.elements[property];
      if(element.type == "text" || element.type == "rich_text")
      {
        var opt = document.createElement("option");
        opt.value = element.name;
        opt.textContent = element.name;
        contentTypeElements.appendChild(opt);
      }
    }
  }
}

//populate with the Content Type Item's Element's Value (text only) that the Delivery API returns
function populateContentTypeItemElementValue(Response)
{
  var copy = document.getElementById("copy");
  var copyNoHtml = document.getElementById("copyNoHtml");

  copy.disabled = true;
  copyNoHtml.disabled = true;

  for(property in Response.item.elements)
  {
    if (Response.item.elements.hasOwnProperty(property))
    { 
      var selectedElement = contentTypeElements.options[contentTypeElements.selectedIndex].value;

      var element = Response.item.elements[property];
      if(element.name == selectedElement)
      {
        var content = document.getElementById("contentTypeElementContent");
        content.innerText = element.value;
        copy.disabled = false;
        copyNoHtml.disabled = false;
        break;
      }
    }
  }
}


//
//Button Actions
//

//Copies textarea content to browser's clipboard
function handleCopy()
{
  var content = document.getElementById("contentTypeElementContent");
  content.select();
  document.execCommand("copy");
  content.blur();
  
  document.getElementById("results").innerText = "Copied to your clipboard.";
  
  setTimeout(() => {
    document.getElementById("results").innerText = "";
    },
    2500
  );
}

//Copies textarea content to browser's clipboard (without html format)
function handleCopyNoHtml()
{
  var content = document.getElementById("contentTypeElementContent");
  var allContent = content.value;
  var cleanContent = allContent.replace(/<\/?[^>]+(>|$)/g, "");
  content.value = cleanContent;

  content.select();
  document.execCommand("copy");
  content.blur();

  content.value = allContent;
  
  document.getElementById("results").innerText = "Copied to your clipboard.";
  
  setTimeout(() => {
    document.getElementById("results").innerText = "";
    },
    2500
  );
}


//
//Main
//
document.addEventListener('DOMContentLoaded', () => {
    //Setup globals
    var projectid = document.getElementById('projectid');
    var contentTypes = document.getElementById('contentTypes');
    var contentTypeItems = document.getElementById('contentTypeItems');    
    var contentTypeElements = document.getElementById('contentTypeElements');
    var copyButton = document.getElementById("copy");
    var copyNoHtmlButton = document.getElementById("copyNoHtml");
    var closeButton = document.getElementById("close");
    var rememberProject = document.getElementById("rememberproject");
    
    //Only if the user wants to, remember the project id and grab it from local storage
    getSavedValue("RememberKenticoCloudProjectID", (val) => {
      if(val){
        rememberProject.checked = true;

        getSavedValue("KenticoCloudProjectID", (val) => {
          projectid.value = val;
          kcAPILoadContentTypes(populateContentTypes);
        });
      }
    });
    
    //Wire up if project input changes
    projectid.addEventListener('blur', () => {
      kcAPILoadContentTypes(populateContentTypes);
    });
  
    //Wire up remember project id checkbox
    rememberProject.addEventListener('click', () =>{
      var projid = projectid.value;
      if(rememberProject.checked)  
      {
        saveValue("RememberKenticoCloudProjectID", true);
        saveValue("KenticoCloudProjectID", projid);
      }
      else{
        saveValue("RememberKenticoCloudProjectID", false);
        saveValue("KenticoCloudProjectID", "");
      }
    });

    //Wire up dropdown selections
    contentTypes.addEventListener('change', () => {
      kcAPILoadContentTypeItems(populateContentTypeItems);
    });

    contentTypeItems.addEventListener('change', () => {
      kcAPILoadContentTypeItemElements(populateContentTypeItemElements);
    });

    contentTypeElements.addEventListener('change', () => {
      kcAPILoadContentTypeItemElements(populateContentTypeItemElementValue);
    });

    //Wire up button clicks
    copyButton.addEventListener("click", () => {
      handleCopy();
    });

    copyNoHtmlButton.addEventListener("click", () => {
      handleCopyNoHtml();
    });

    closeButton.addEventListener("click", () => {
      window.close();
    });
});
/**
 * Created by Manbiao.Huang on 24-May-16.
 */
starter.filter("CauseCategoryFilter", function (Store) {
  return function(causeCategory){
    return Store.getcauseCategory(causeCategory);
  }
});

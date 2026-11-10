using App.Core.Authorization;

namespace App.Core.Interfaces;

// The signed-in user for this request, loaded from the database by UserContextMiddleware in App.Api.
// Null when nobody is signed in. Core reads it; only App.Api sets it.
public interface ICurrentUser
{
    public UserContext? Value { get; }
}
